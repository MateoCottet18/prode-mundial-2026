import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/services/emailService";
import { buildPaymentApprovedEmail } from "@/lib/services/emailTemplates";
import {
  getSupabaseAdminClient,
  isSupabaseServiceRoleConfigured,
} from "@/lib/supabase/server";

/**
 * POST /api/admin/notify-payment-approved
 * Authorization: Bearer <access_token del admin>
 * Body: { userId: string }
 *
 * Manda el email "tu pago fue aprobado" al usuario indicado.
 *
 * Seguridad:
 *   1. Validamos que el JWT del caller corresponda a un usuario con
 *      rol "admin" en `public.profiles`. Sin esto, cualquier usuario
 *      logueado podría disparar emails a terceros.
 *   2. Leemos el profile del target con service role (RLS-bypass) sólo
 *      para obtener email + nombre del destinatario.
 *
 * El envío es best-effort: si Resend falla devolvemos 200 con
 * `{ ok: true, emailSent: false }` para que el flujo del admin no se rompa.
 */
type Body = {
  userId?: string;
};

export async function POST(request: Request) {
  if (!isSupabaseServiceRoleConfigured()) {
    return NextResponse.json(
      { error: "Servidor sin SUPABASE_SERVICE_ROLE_KEY." },
      { status: 503 },
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.json(
      { error: "Supabase no configurado en servidor." },
      { status: 503 },
    );
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return NextResponse.json(
      { error: "Falta Authorization Bearer token." },
      { status: 401 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }

  const targetUserId = body.userId?.trim();
  if (!targetUserId) {
    return NextResponse.json({ error: "Falta userId." }, { status: 400 });
  }

  // 1) Validamos JWT y leemos rol del caller.
  const authClient = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: callerData, error: callerError } = await authClient.auth.getUser(token);
  if (callerError || !callerData.user) {
    return NextResponse.json(
      { error: "Sesión inválida o expirada." },
      { status: 401 },
    );
  }
  const callerUserId = callerData.user.id;

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "No se pudo conectar a Supabase." }, { status: 500 });
  }

  const { data: callerProfile, error: callerProfileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", callerUserId)
    .maybeSingle();

  if (callerProfileError) {
    return NextResponse.json(
      { error: callerProfileError.message },
      { status: 500 },
    );
  }
  if (!callerProfile || callerProfile.role !== "admin") {
    return NextResponse.json(
      { error: "Sólo el admin puede disparar esta notificación." },
      { status: 403 },
    );
  }

  // 2) Datos del destinatario (service role bypassa RLS).
  const { data: targetProfile, error: targetError } = await supabase
    .from("profiles")
    .select("id,name,username,email")
    .eq("id", targetUserId)
    .maybeSingle();

  if (targetError) {
    return NextResponse.json({ error: targetError.message }, { status: 500 });
  }
  if (!targetProfile?.email) {
    return NextResponse.json(
      { ok: true, emailSent: false, reason: "no_email" },
      { status: 200 },
    );
  }

  const { subject, html, text } = buildPaymentApprovedEmail({
    name: targetProfile.name ?? "",
    username: targetProfile.username ?? "",
  });

  const result = await sendEmail({
    to: targetProfile.email,
    subject,
    html,
    text,
    tag: "payment-approved",
  });

  if (!result.ok) {
    console.warn("[notify-payment-approved] no se envió", result);
    return NextResponse.json(
      { ok: true, emailSent: false, reason: result.reason },
      { status: 200 },
    );
  }

  return NextResponse.json({ ok: true, emailSent: true, id: result.id });
}
