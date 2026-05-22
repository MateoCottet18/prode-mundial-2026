import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { mapProfileRole } from "@/lib/services/profileService";
import {
  getSupabaseAdminClient,
  isSupabaseServiceRoleConfigured,
} from "@/lib/supabase/server";

/**
 * GET /api/auth/my-profile
 * Authorization: Bearer <access_token>
 *
 * Lee el profile del usuario autenticado vía service role, validando antes el JWT.
 * Usado como respaldo fiable en login cuando RLS del cliente anon cuelga.
 * Solo devuelve datos del propio usuario (id del token).
 */
export async function GET(request: Request) {
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
    console.error("[read-profile] token inválido", userError?.message);
    return NextResponse.json({ error: "Sesión inválida o expirada." }, { status: 401 });
  }

  const userId = userData.user.id;
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return NextResponse.json({ error: "No se pudo conectar a Supabase." }, { status: 500 });
  }

  console.log("[read-profile] query iniciada (server)", userId);

  const { data, error } = await supabase
    .from("profiles")
    .select("id,name,username,role,payment_status")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[read-profile] error server", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    console.warn("[read-profile] profile no encontrado (server)", userId);
    return NextResponse.json({ found: false }, { status: 404 });
  }

  console.log("[read-profile] profile encontrado (server)", data.username);

  return NextResponse.json({
    found: true,
    user: {
      userId: data.id,
      username: data.username,
      name: data.name,
      role: mapProfileRole(String(data.role)),
      paymentStatus: data.payment_status,
    },
  });
}
