import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { scorePrediction } from "@/lib/scorePrediction";
import { fetchAllFromTable } from "@/lib/supabase/paginate";
import {
  getSupabaseAdminClient,
  isSupabaseServiceRoleConfigured,
} from "@/lib/supabase/server";

type PredictionRow = {
  id: string;
  match_id: string;
  home_goals: number;
  away_goals: number;
  points: number;
};

type ResultRow = {
  match_id: string;
  home_goals: number;
  away_goals: number;
};

/**
 * POST /api/admin/recalculate-points
 * Authorization: Bearer <admin access_token>
 *
 * Recalcula predictions.points leyendo TODOS los results y predictions desde DB.
 * Usa paginación (Supabase limita a 1000 filas por query).
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

  const authClient = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: userData, error: userError } = await authClient.auth.getUser(token);
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Sesión inválida o expirada." }, { status: 401 });
  }

  const admin = getSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "No se pudo conectar a Supabase." }, { status: 500 });
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Solo admin." }, { status: 403 });
  }

  // Preferir función SQL si ya está desplegada (repair_points.sql).
  const { data: rpcUpdated, error: rpcError } = await admin.rpc(
    "recalculate_all_prediction_points",
  );
  if (!rpcError && typeof rpcUpdated === "number") {
    console.log("[recalculate-points-api] rpc done", { updated: rpcUpdated });
    return NextResponse.json({
      ok: true,
      method: "rpc",
      examined: null,
      updated: rpcUpdated,
    });
  }

  if (rpcError && !rpcError.message.includes("Could not find the function")) {
    console.warn("[recalculate-points-api] rpc failed, falling back to JS", rpcError.message);
  }

  let predictions: PredictionRow[];
  let results: ResultRow[];
  try {
    [predictions, results] = await Promise.all([
      fetchAllFromTable<PredictionRow>(
        admin,
        "predictions",
        "id,match_id,home_goals,away_goals,points",
      ),
      fetchAllFromTable<ResultRow>(admin, "results", "match_id,home_goals,away_goals"),
    ]);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error leyendo datos.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const resultByMatch = new Map(
    results.map((row) => [row.match_id, { home: row.home_goals, away: row.away_goals }]),
  );

  const idsByPoints = new Map<number, string[]>();
  let examined = 0;
  let mismatches = 0;

  for (const row of predictions) {
    if (!row.id) continue;
    examined += 1;
    const result = resultByMatch.get(row.match_id);
    const scored = result
      ? scorePrediction(
          { home: row.home_goals, away: row.away_goals },
          { home: result.home, away: result.away },
        )
      : null;
    const nextPoints = scored?.points ?? 0;
    if (nextPoints === row.points) continue;
    mismatches += 1;
    const list = idsByPoints.get(nextPoints);
    if (list) list.push(row.id);
    else idsByPoints.set(nextPoints, [row.id]);
  }

  let updated = 0;
  const CHUNK = 500;
  const now = new Date().toISOString();
  for (const [points, ids] of idsByPoints) {
    for (let i = 0; i < ids.length; i += CHUNK) {
      const chunk = ids.slice(i, i + CHUNK);
      const { error } = await admin
        .from("predictions")
        .update({ points, points_updated_at: now })
        .in("id", chunk);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      updated += chunk.length;
    }
  }

  console.log("[recalculate-points-api] done", { examined, mismatches, updated });

  return NextResponse.json({
    ok: true,
    method: "js",
    examined,
    mismatches,
    updated,
  });
}
