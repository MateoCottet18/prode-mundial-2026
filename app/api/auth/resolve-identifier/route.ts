import { NextResponse } from "next/server";
import {
  getSupabaseAdminClient,
  isSupabaseServiceRoleConfigured,
} from "@/lib/supabase/server";

/**
 * GET /api/auth/resolve-identifier?identifier=<username|email>
 *
 * Resuelve un username o email de login al email de Supabase Auth.
 * Usa service role solo en el servidor (bypasea RLS sin exponer la key).
 *
 * Respuesta mínima: { found: true, email } — sin passwords ni datos extra.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const identifier = (url.searchParams.get("identifier") ?? "")
    .trim()
    .toLowerCase();

  if (!identifier) {
    return NextResponse.json(
      { found: false, error: "Falta el parámetro identifier." },
      { status: 400 },
    );
  }

  if (!isSupabaseServiceRoleConfigured()) {
    console.error("[resolve-identifier] service role no configurado");
    return NextResponse.json(
      { found: false, error: "Servidor sin SUPABASE_SERVICE_ROLE_KEY." },
      { status: 503 },
    );
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { found: false, error: "No se pudo conectar a Supabase." },
      { status: 500 },
    );
  }

  const isEmail = identifier.includes("@");
  console.log("[resolve-identifier] buscando...", {
    identifier,
    mode: isEmail ? "email" : "username",
  });

  const column = isEmail ? "email" : "username";
  const { data, error } = await supabase
    .from("profiles")
    .select("email")
    .eq(column, identifier)
    .maybeSingle();

  if (error) {
    console.error("[resolve-identifier] error en profiles", error.message);
    return NextResponse.json(
      { found: false, error: "No se pudo consultar profiles." },
      { status: 500 },
    );
  }

  if (data?.email) {
    const email = String(data.email).trim().toLowerCase();
    console.log("[resolve-identifier] encontrado...", {
      mode: column,
      email: maskEmail(email),
    });
    return NextResponse.json({ found: true, email });
  }

  // Email escrito directo: permitir intentar Auth aunque no haya fila en profiles.
  if (isEmail) {
    console.log("[resolve-identifier] fallback email...", maskEmail(identifier));
    return NextResponse.json({
      found: true,
      email: identifier,
      source: "fallback",
    });
  }

  console.log("[resolve-identifier] no encontrado:", identifier);
  return NextResponse.json({ found: false }, { status: 404 });
}

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const head = local?.slice(0, 2) ?? "";
  return `${head}***@${domain}`;
}
