import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { pointsForStoredPrediction } from "@/lib/scorePrediction";
import { validatePredictionSaveWindow } from "@/lib/predictionLockServer";
import { parseScore } from "@/lib/prode";
import {
  getSupabaseAdminClient,
  isSupabaseServiceRoleConfigured,
} from "@/lib/supabase/server";

type SaveBody = {
  matchId?: string;
  homeGoals?: number;
  awayGoals?: number;
};

/**
 * POST /api/predictions/save
 * Authorization: Bearer <access_token>
 *
 * Guardado server-side con validación de ventana (kickoff Argentina + sin resultado).
 * Evita saves tardíos aunque el frontend falle o esté desactualizado.
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    return NextResponse.json({ error: "Falta Authorization Bearer token." }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey || !isSupabaseServiceRoleConfigured()) {
    return NextResponse.json({ error: "Supabase no configurado en servidor." }, { status: 503 });
  }

  let body: SaveBody;
  try {
    body = (await request.json()) as SaveBody;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const matchId = body.matchId?.trim();
  const homeGoals = body.homeGoals;
  const awayGoals = body.awayGoals;

  if (!matchId) {
    return NextResponse.json({ error: "matchId requerido." }, { status: 400 });
  }

  if (
    !Number.isInteger(homeGoals) ||
    !Number.isInteger(awayGoals) ||
    homeGoals! < 0 ||
    awayGoals! < 0
  ) {
    return NextResponse.json(
      { error: "Marcá un resultado válido (goles 0 o más)." },
      { status: 400 },
    );
  }

  const authClient = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: userData, error: userError } = await authClient.auth.getUser(token);
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Sesión inválida o expirada." }, { status: 401 });
  }

  const userId = userData.user.id;
  const admin = getSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "No se pudo conectar a Supabase." }, { status: 500 });
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("role,payment_status")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  if (!profile) {
    return NextResponse.json({ error: "Perfil no encontrado." }, { status: 404 });
  }

  if (profile.role === "admin") {
    return NextResponse.json(
      { error: "El admin no carga predicciones." },
      { status: 403 },
    );
  }

  const [{ data: matchRow, error: matchError }, { data: resultRow, error: resultError }] =
    await Promise.all([
      admin.from("matches").select("id,kickoff_utc,kickoff_argentina").eq("id", matchId).maybeSingle(),
      admin.from("results").select("match_id,home_goals,away_goals").eq("match_id", matchId).maybeSingle(),
    ]);

  if (matchError) {
    return NextResponse.json({ error: matchError.message }, { status: 500 });
  }
  if (resultError) {
    return NextResponse.json({ error: resultError.message }, { status: 500 });
  }

  const gate = validatePredictionSaveWindow(
    matchRow,
    Boolean(resultRow && parseScore({ home: String(resultRow.home_goals), away: String(resultRow.away_goals) })),
    new Date(),
  );

  if (!gate.allowed) {
    console.warn("[prediction-save-api] blocked", {
      userId,
      matchId,
      reason: gate.reason,
    });
    return NextResponse.json({ error: gate.message, code: gate.reason }, { status: 403 });
  }

  const score = { home: String(homeGoals), away: String(awayGoals) };
  const resultScore = resultRow
    ? { home: String(resultRow.home_goals), away: String(resultRow.away_goals) }
    : undefined;
  const points = pointsForStoredPrediction(score, resultScore);

  const { data, error } = await admin
    .from("predictions")
    .upsert(
      {
        user_id: userId,
        match_id: matchId,
        home_goals: homeGoals,
        away_goals: awayGoals,
        points,
      },
      { onConflict: "user_id,match_id" },
    )
    .select("user_id,match_id,home_goals,away_goals,points")
    .single();

  if (error) {
    console.error("[prediction-save-api] upsert error", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log("[prediction-save-api] OK", { userId, matchId, points });

  return NextResponse.json({ ok: true, prediction: data });
}
