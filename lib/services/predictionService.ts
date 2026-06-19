import { calculatePoints, getResult, parseScore, type PredictionsByUser, type ResultsByMatch, type SavedPredictionsByUser, type ScoreInput } from "@/lib/prode";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { toScoreInput } from "@/lib/supabase/types";

/**
 * Trae predicciones desde Supabase.
 *
 * Si se pasa `userId`, sólo devuelve las predicciones de ese usuario.
 * Esto es el camino caliente para `/partidos` y `/perfil` donde el usuario
 * sólo necesita las propias para editar/ver. A 500 usuarios x 104 matches el
 * fetch sin filtro pesa ~4 MB; con filtro queda en ~10 KB.
 *
 * Sin `userId`, devuelve todo. Compat para vistas que aún lo necesiten.
 *
 * Para el RANKING, NO usar este fetcher. Usar `fetchRankingAggregatesFromSupabase`
 * que devuelve totales pre-agregados (~500 filas en vez de ~52k).
 */
export async function fetchPredictionsFromSupabase(callerUserId?: string) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return null;
  }

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  const authUid = authUser?.id ?? null;
  console.log("[predictions-load] auth.uid", authUid ?? "(none)");
  console.log("[predictions-load] caller userId", callerUserId ?? "(none)");
  if (authError) {
    console.warn("[predictions-load] auth.getUser error", authError.message);
  }

  // Fuente de verdad para filtrar: auth.uid(). El caller (session cache) puede
  // estar desfasado y dejar la UI en "Vacía" aunque Supabase tenga filas.
  const filterUserId = authUid ?? callerUserId ?? undefined;

  if (authUid && callerUserId && authUid !== callerUserId) {
    console.warn("[predictions-load] MISMATCH session userId vs auth.uid()", {
      sessionUserId: callerUserId,
      authUid,
    });
  }

  const baseQuery = supabase
    .from("predictions")
    .select("user_id,match_id,home_goals,away_goals");

  const { data, error } = filterUserId
    ? await baseQuery.eq("user_id", filterUserId)
    : await baseQuery;

  if (error) {
    throw new Error(error.message);
  }

  const rows = data ?? [];
  console.log("[predictions-load] fetched rows", rows.length);

  const predictions: PredictionsByUser = {};
  const savedPredictions: SavedPredictionsByUser = {};

  // Cuando filtramos por usuario, indexamos bajo auth.uid() (y también bajo el
  // user_id de cada fila) para que la UI encuentre las predicciones aunque el
  // session cache traiga otra clave.
  const lookupKeys = new Set<string>();
  if (filterUserId) lookupKeys.add(filterUserId);
  if (authUid) lookupKeys.add(authUid);
  if (callerUserId) lookupKeys.add(callerUserId);

  for (const prediction of rows) {
    const score = toScoreInput(prediction.home_goals, prediction.away_goals);
    const keysForRow = new Set([prediction.user_id, ...lookupKeys]);
    for (const key of keysForRow) {
      predictions[key] = {
        ...(predictions[key] ?? {}),
        [prediction.match_id]: score,
      };
      savedPredictions[key] = {
        ...(savedPredictions[key] ?? {}),
        [prediction.match_id]: true,
      };
    }
  }

  console.log("[predictions-load] prediction map keys", Object.keys(predictions));

  return {
    predictions,
    savedPredictions,
    resolvedUserId: authUid ?? callerUserId ?? rows[0]?.user_id ?? null,
  };
}

/**
 * Totales pre-agregados por usuario para el ranking.
 *
 * Lee `public.prediction_aggregates`, una view que agrupa
 * `public.predictions` por `user_id` y devuelve los 4 contadores que el
 * ranking necesita. Cálculo en Postgres, no en JS.
 *
 * Trade-off: depende de que `predictions.points` esté actualizada. Eso ya
 * está garantizado: `recalculatePredictionPoints` corre tras cada save/delete
 * de result.
 */
export type PredictionAggregate = {
  userId: string;
  points: number;
  exactCount: number;
  correctOutcomesCount: number;
  savedCount: number;
};

export async function fetchRankingAggregatesFromSupabase(): Promise<
  PredictionAggregate[] | null
> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("prediction_aggregates")
    .select("user_id,points,exact_count,correct_outcomes_count,saved_count");

  if (error) {
    // Si la view no existe todavía (DB sin migrar), devolvemos null para que el
    // caller caiga a un fallback en lugar de romper la página.
    console.error(
      "[predictionService] no se pudo leer prediction_aggregates",
      error.message,
    );
    return null;
  }

  return (data ?? []).map((row) => ({
    userId: row.user_id,
    points: row.points ?? 0,
    exactCount: row.exact_count ?? 0,
    correctOutcomesCount: row.correct_outcomes_count ?? 0,
    savedCount: row.saved_count ?? 0,
  }));
}

// -----------------------------------------------------------------------------
// Revelación de predicciones por partido
//
// Una vez que el partido comenzó (kickoff pasó o hay resultado cargado),
// cualquier participante puede ver las predicciones de los demás. Antes del
// kickoff esto NO debe llamarse (el gating temporal lo decide el caller con
// el `PredictionLock`). La fuente es siempre `public.predictions` (no estado
// local) + `public.profiles` para los nombres.
// -----------------------------------------------------------------------------

export type MatchPredictionEntry = {
  userId: string;
  name: string;
  home: number;
  away: number;
  outcome: "local" | "empate" | "visitante";
};

export type MatchPredictionsSummary = {
  total: number;
  home: number;
  draw: number;
  away: number;
};

export type MatchPredictionsReveal = {
  entries: MatchPredictionEntry[];
  summary: MatchPredictionsSummary;
};

/**
 * Trae todas las predicciones guardadas para un `matchId`, con el nombre del
 * participante y un resumen agregado (total + local/empate/visitante).
 *
 * - Sólo incluye participantes (excluye admin).
 * - Ordena alfabéticamente por nombre.
 * - Devuelve `null` si Supabase no está configurado.
 *
 * No toca ranking, puntos ni resultados: es sólo lectura para visualización.
 */
export async function fetchMatchPredictions(
  matchId: string,
): Promise<MatchPredictionsReveal | null> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return null;
  }

  const { data: predRows, error: predError } = await supabase
    .from("predictions")
    .select("user_id,home_goals,away_goals")
    .eq("match_id", matchId);

  if (predError) {
    throw new Error(predError.message);
  }

  const rows = predRows ?? [];
  const emptySummary: MatchPredictionsSummary = { total: 0, home: 0, draw: 0, away: 0 };
  if (rows.length === 0) {
    return { entries: [], summary: emptySummary };
  }

  const userIds = Array.from(new Set(rows.map((row) => row.user_id)));
  const { data: profileRows, error: profileError } = await supabase
    .from("profiles")
    .select("id,name,username,role")
    .in("id", userIds);

  if (profileError) {
    throw new Error(profileError.message);
  }

  const profileById = new Map<
    string,
    { name: string | null; username: string | null; role: string }
  >();
  for (const profile of profileRows ?? []) {
    profileById.set(profile.id, {
      name: profile.name,
      username: profile.username,
      role: String(profile.role),
    });
  }

  const entries: MatchPredictionEntry[] = [];
  for (const row of rows) {
    const profile = profileById.get(row.user_id);
    if (!profile || profile.role === "admin") {
      continue;
    }
    entries.push({
      userId: row.user_id,
      name: profile.name?.trim() || profile.username || "Participante",
      home: row.home_goals,
      away: row.away_goals,
      outcome: getResult(row.home_goals, row.away_goals),
    });
  }

  entries.sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }));

  const summary = entries.reduce<MatchPredictionsSummary>(
    (acc, entry) => {
      acc.total += 1;
      if (entry.outcome === "local") acc.home += 1;
      else if (entry.outcome === "visitante") acc.away += 1;
      else acc.draw += 1;
      return acc;
    },
    { total: 0, home: 0, draw: 0, away: 0 },
  );

  return { entries, summary };
}

export class PredictionSaveError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "not_configured"
      | "invalid_score"
      | "no_session"
      | "user_mismatch"
      | "supabase_error"
      | "result_loaded"
      | "kickoff_passed"
      | "schedule_unconfirmed"
      | "admin_cannot_predict"
      | "blocked",
    public readonly details?: string,
  ) {
    super(message);
    this.name = "PredictionSaveError";
  }
}

async function getAccessToken(): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

/**
 * Persiste una predicción vía POST /api/predictions/save (server-side).
 *
 * El endpoint valida kickoff Argentina, ausencia de resultado y sesión real.
 * Supabase RLS + trigger SQL son defensa adicional si alguien intenta bypass.
 */
export async function savePredictionToSupabase({
  userId,
  matchId,
  score,
}: {
  userId: string;
  matchId: string;
  score: ScoreInput;
  results?: ResultsByMatch;
}) {
  const parsedScore = parseScore(score);

  console.log("[prediction] intentando guardar (API)");
  console.log("[prediction] userId (caller)", userId);
  console.log("[prediction] matchId", matchId);

  if (!isSupabaseConfigured()) {
    throw new PredictionSaveError(
      "Supabase no está configurado. Revisá NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      "not_configured",
    );
  }

  if (!parsedScore) {
    throw new PredictionSaveError(
      "Marcá un resultado válido (goles 0 o más) antes de guardar.",
      "invalid_score",
    );
  }

  const token = await getAccessToken();
  if (!token) {
    throw new PredictionSaveError(
      "Sesión expirada o no iniciada. Cerrá sesión, volvé a entrar e intentá de nuevo.",
      "no_session",
    );
  }

  const response = await fetch("/api/predictions/save", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      matchId,
      homeGoals: parsedScore.home,
      awayGoals: parsedScore.away,
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
    code?: PredictionSaveError["code"];
    ok?: boolean;
  };

  if (!response.ok) {
    const code =
      payload.code ??
      (response.status === 401
        ? "no_session"
        : response.status === 403
          ? "blocked"
          : "supabase_error");
    console.error("[prediction] error API", payload.error ?? response.statusText, code);
    throw new PredictionSaveError(
      payload.error ?? "No se pudo guardar la predicción.",
      code,
    );
  }

  console.log("[prediction] guardado OK (API)", { matchId, userId });
  return true;
}

export async function deletePredictionFromSupabase(userId: string, matchId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new PredictionSaveError("Supabase no configurado.", "not_configured");
  }

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    throw new PredictionSaveError(
      "Sesión expirada. Volvé a iniciar sesión.",
      "no_session",
      authError?.message,
    );
  }

  const authUserId = authUser.id;

  const { error } = await supabase
    .from("predictions")
    .delete()
    .eq("user_id", authUserId)
    .eq("match_id", matchId);

  if (error) {
    throw new Error(error.message);
  }
  return true;
}

/**
 * Recalcula `points` para TODAS las predicciones leyendo resultados desde la DB.
 *
 * Preferir `recalculatePredictionPointsViaApi` (admin) en producción: usa service
 * role y evita depender del mapa `results` del cliente.
 */
export async function recalculatePredictionPoints(resultsOverride?: ResultsByMatch) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return false;
  }

  let results = resultsOverride;
  if (!results) {
    const { data: resultRows, error: resultError } = await supabase
      .from("results")
      .select("match_id,home_goals,away_goals");
    if (resultError) {
      throw new Error(resultError.message);
    }
    results = Object.fromEntries(
      (resultRows ?? []).map((row) => [
        row.match_id,
        toScoreInput(row.home_goals, row.away_goals),
      ]),
    ) as ResultsByMatch;
  }

  const { data, error } = await supabase
    .from("predictions")
    .select("id,match_id,home_goals,away_goals,points");

  if (error) {
    throw new Error(error.message);
  }

  const idsByPoints = new Map<number, string[]>();
  for (const row of data ?? []) {
    if (!row.id) continue;
    const score = toScoreInput(row.home_goals, row.away_goals);
    const next = calculatePoints(score, results[row.match_id], true) ?? 0;
    if (next === row.points) {
      continue;
    }
    const list = idsByPoints.get(next);
    if (list) {
      list.push(row.id);
    } else {
      idsByPoints.set(next, [row.id]);
    }
  }

  const CHUNK_SIZE = 500;
  for (const [points, ids] of idsByPoints) {
    for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
      const chunk = ids.slice(i, i + CHUNK_SIZE);
      const { error: updateError } = await supabase
        .from("predictions")
        .update({ points })
        .in("id", chunk);
      if (updateError) {
        throw new Error(updateError.message);
      }
    }
  }

  return true;
}

/** Recalcula puntos vía API admin (service role + resultados desde DB). */
export async function recalculatePredictionPointsViaApi(): Promise<boolean> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("Sesión expirada. Volvé a iniciar sesión.");
  }

  const response = await fetch("/api/admin/recalculate-points", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });

  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
    ok?: boolean;
    updated?: number;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "No se pudo recalcular puntos.");
  }

  console.log("[prediction] recalc OK (API)", payload);
  return true;
}
