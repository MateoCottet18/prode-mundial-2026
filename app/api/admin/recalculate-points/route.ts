import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { scorePrediction } from "@/lib/scorePrediction";
import {
  getSupabaseAdminClient,
  isSupabaseServiceRoleConfigured,
} from "@/lib/supabase/server";

/**
 * POST /api/admin/recalculate-points
 * Authorization: Bearer <admin access_token>
 *
 * Recalcula predictions.points leyendo resultados desde la DB (fuente de verdad).
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

  const [{ data: predictions, error: predError }, { data: results, error: resError }] =
    await Promise.all([
      admin.from("predictions").select("id,match_id,home_goals,away_goals,points"),
      admin.from("results").select("match_id,home_goals,away_goals"),
    ]);

  if (predError) {
    return NextResponse.json({ error: predError.message }, { status: 500 });
  }
  if (resError) {
    return NextResponse.json({ error: resError.message }, { status: 500 });
  }

  const resultByMatch = new Map(
    (results ?? []).map((row) => [row.match_id, { home: row.home_goals, away: row.away_goals }]),
  );

  const idsByPoints = new Map<number, string[]>();
  let examined = 0;

  for (const row of predictions ?? []) {
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
    const list = idsByPoints.get(nextPoints);
    if (list) list.push(row.id);
    else idsByPoints.set(nextPoints, [row.id]);
  }

  let updated = 0;
  const CHUNK = 500;
  for (const [points, ids] of idsByPoints) {
    for (let i = 0; i < ids.length; i += CHUNK) {
      const chunk = ids.slice(i, i + CHUNK);
      const { error } = await admin.from("predictions").update({ points }).in("id", chunk);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      updated += chunk.length;
    }
  }

  console.log("[recalculate-points-api] done", { examined, updated });

  return NextResponse.json({ ok: true, examined, updated });
}
