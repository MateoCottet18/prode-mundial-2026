import { calculatePoints, parseScore, type PredictionsByUser, type ResultsByMatch, type SavedPredictionsByUser, type ScoreInput } from "@/lib/prode";
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
export async function fetchPredictionsFromSupabase(userId?: string) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return null;
  }

  const baseQuery = supabase
    .from("predictions")
    .select("user_id,match_id,home_goals,away_goals");

  const { data, error } = userId
    ? await baseQuery.eq("user_id", userId)
    : await baseQuery;

  if (error) {
    throw new Error(error.message);
  }

  const predictions: PredictionsByUser = {};
  const savedPredictions: SavedPredictionsByUser = {};

  data.forEach((prediction) => {
    predictions[prediction.user_id] = {
      ...(predictions[prediction.user_id] ?? {}),
      [prediction.match_id]: toScoreInput(prediction.home_goals, prediction.away_goals),
    };
    savedPredictions[prediction.user_id] = {
      ...(savedPredictions[prediction.user_id] ?? {}),
      [prediction.match_id]: true,
    };
  });

  return { predictions, savedPredictions };
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

export class PredictionSaveError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "not_configured"
      | "invalid_score"
      | "no_session"
      | "user_mismatch"
      | "supabase_error",
    public readonly details?: string,
  ) {
    super(message);
    this.name = "PredictionSaveError";
  }
}

/**
 * Persiste una predicción en `public.predictions`.
 *
 * Requisitos de producción:
 * - `user_id` DEBE ser `auth.users.id` (UUID), no username.
 * - El cliente Supabase DEBE tener sesión activa (RLS: auth.uid() = user_id).
 * - Upsert sobre unique (user_id, match_id).
 */
export async function savePredictionToSupabase({
  userId,
  matchId,
  score,
  results,
}: {
  userId: string;
  matchId: string;
  score: ScoreInput;
  results: ResultsByMatch;
}) {
  const parsedScore = parseScore(score);

  console.log("[prediction] intentando guardar");
  console.log("[prediction] userId (caller)", userId);
  console.log("[prediction] matchId", matchId);
  console.log("[prediction] home_goals", parsedScore?.home ?? score.home);
  console.log("[prediction] away_goals", parsedScore?.away ?? score.away);

  if (!isSupabaseConfigured()) {
    const msg =
      "Supabase no está configurado. Revisá NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.";
    console.error("[prediction] error Supabase", msg);
    throw new PredictionSaveError(msg, "not_configured");
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    const msg = "No se pudo crear el cliente de Supabase.";
    console.error("[prediction] error Supabase", msg);
    throw new PredictionSaveError(msg, "not_configured");
  }

  if (!parsedScore) {
    const msg = "Marcá un resultado válido (goles 0 o más) antes de guardar.";
    console.error("[prediction] error Supabase", msg);
    throw new PredictionSaveError(msg, "invalid_score");
  }

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    const msg =
      "Sesión expirada o no iniciada. Cerrá sesión, volvé a entrar e intentá de nuevo.";
    console.error("[prediction] error Supabase", authError?.message ?? "sin auth.uid()");
    throw new PredictionSaveError(msg, "no_session", authError?.message);
  }

  const authUserId = authUser.id;
  console.log("[prediction] auth.uid()", authUserId);

  if (userId !== authUserId) {
    console.warn("[prediction] userId del caller no coincide con auth.uid()", {
      caller: userId,
      auth: authUserId,
    });
    // Siempre persistimos con auth.uid(): es lo que exige RLS.
  }

  const points = calculatePoints(score, results[matchId], true) ?? 0;

  const { data, error } = await supabase
    .from("predictions")
    .upsert(
      {
        user_id: authUserId,
        match_id: matchId,
        home_goals: parsedScore.home,
        away_goals: parsedScore.away,
        points,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,match_id" },
    )
    .select("user_id,match_id,home_goals,away_goals,points")
    .single();

  if (error) {
    console.error("[prediction] error Supabase", error.message, error.code, error.details);
    const hint =
      error.code === "42501"
        ? " Permiso denegado por RLS: verificá que estés logueado y que user_id = auth.uid()."
        : "";
    throw new PredictionSaveError(
      `${error.message}${hint}`,
      "supabase_error",
      error.details ?? error.hint,
    );
  }

  if (!data) {
    const msg = "Supabase no devolvió la fila guardada.";
    console.error("[prediction] error Supabase", msg);
    throw new PredictionSaveError(msg, "supabase_error");
  }

  console.log("[prediction] guardado OK", {
    user_id: data.user_id,
    match_id: data.match_id,
    home_goals: data.home_goals,
    away_goals: data.away_goals,
    points: data.points,
  });

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
 * Recalcula `points` para TODAS las predicciones según los resultados pasados.
 *
 * Implementación optimizada para ~100-300 participantes:
 *   1. Traemos todas las predicciones (incluyendo `points` actual).
 *   2. Calculamos el nuevo valor en memoria.
 *   3. Agrupamos los IDs por valor de `points` y SÓLO actualizamos las filas
 *      que cambian, en pocas queries.
 *
 * En la práctica `calculatePoints` devuelve 0/1/3, así que en el peor caso
 * son 3 buckets → 3 UPDATEs (chunkeados a 500 ids por seguridad de URL).
 * Antes hacíamos un UPDATE por predicción (hasta 10k+ requests en paralelo,
 * que saturaba el free tier de Supabase).
 */
export async function recalculatePredictionPoints(results: ResultsByMatch) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return false;
  }

  const { data, error } = await supabase
    .from("predictions")
    .select("id,match_id,home_goals,away_goals,points");

  if (error) {
    throw new Error(error.message);
  }

  const idsByPoints = new Map<number, string[]>();
  for (const row of data ?? []) {
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

  // Chunkeamos por seguridad de URL (Supabase REST usa GET-style filters
  // en updates con .in() y URLs >8KB pueden romperse en algunos proxies).
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
