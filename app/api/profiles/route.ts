import { NextResponse } from "next/server";
import { enforcePaymentStatusForUser, enforceRoleForUser } from "@/lib/admin";
import { getSupabaseAdminClient, isSupabaseServiceRoleConfigured } from "@/lib/supabase/server";

type CreateProfileBody = {
  id?: string;
  name?: string;
  email?: string;
  username?: string;
};

export async function POST(request: Request) {
  const supabaseUrlExists = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceRoleExists = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!isSupabaseServiceRoleConfigured()) {
    console.error("error de variables env faltantes", {
      supabaseUrlExists,
      serviceRoleExists,
    });

    return NextResponse.json(
      {
        error: "Faltan variables de entorno de Supabase en el servidor.",
        supabaseUrlExists,
        serviceRoleExists,
      },
      { status: 500 },
    );
  }

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Faltan variables de entorno de Supabase en el servidor." },
      { status: 500 },
    );
  }

  const body = (await request.json()) as CreateProfileBody;
  const id = body.id?.trim();
  const name = body.name?.trim();
  const email = body.email?.trim().toLowerCase();
  const username = body.username?.trim().toLowerCase();

  if (!id || !name || !email || !username) {
    return NextResponse.json({ error: "Faltan datos obligatorios del perfil." }, { status: 400 });
  }

  // Admin protection: if this is the configured admin (by email OR username),
  // lock role and payment_status.
  const identity = { email, username };
  const effectiveRole = enforceRoleForUser(identity, "participante");
  // Usuario nuevo: 'pending' (todavía no subió comprobante).
  const effectivePaymentStatus = enforcePaymentStatusForUser(identity, "pending");

  const { error } = await supabase.from("profiles").insert({
    id,
    name,
    email,
    username,
    role: effectiveRole,
    payment_status: effectivePaymentStatus,
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error("error insertando profile", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return NextResponse.json(
      {
        error: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
