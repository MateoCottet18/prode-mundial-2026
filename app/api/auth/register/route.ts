import { NextResponse } from "next/server";
import {
  enforcePaymentStatusForUser,
  enforceRoleForUser,
  shouldBlockAdminDeletion,
} from "@/lib/admin";
import { mapAuthErrorMessage } from "@/lib/authErrors";
import { getSupabaseAdminClient, isSupabaseServiceRoleConfigured } from "@/lib/supabase/server";

type RegisterBody = {
  name?: string;
  email?: string;
  username?: string;
  password?: string;
};

/**
 * Registro de participantes vía service role.
 *
 * Usa `auth.admin.createUser` con `email_confirm: true` → NO envía email de
 * confirmación y evita el rate limit de "email rate limit exceeded".
 *
 * Luego crea la fila en `public.profiles` con role participante y
 * payment_status pending_review (salvo admin protegido por env).
 */
export async function POST(request: Request) {
  if (!isSupabaseServiceRoleConfigured()) {
    return NextResponse.json(
      {
        error:
          "Registro por servidor no disponible (falta SUPABASE_SERVICE_ROLE_KEY). Usá el flujo alternativo o configurá el entorno.",
        useClientSignup: true,
      },
      { status: 503 },
    );
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "No se pudo conectar a Supabase." }, { status: 500 });
  }

  let body: RegisterBody;
  try {
    body = (await request.json()) as RegisterBody;
  } catch {
    return NextResponse.json({ error: "Cuerpo de solicitud inválido." }, { status: 400 });
  }

  const name = body.name?.trim();
  const email = body.email?.trim().toLowerCase();
  const username = body.username?.trim().toLowerCase();
  const password = body.password ?? "";

  if (!name || !email || !username || password.length < 6) {
    return NextResponse.json(
      { error: "Completá nombre, email, usuario y una contraseña de al menos 6 caracteres." },
      { status: 400 },
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "El email no es válido." }, { status: 400 });
  }

  const { data: existingEmail } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existingEmail) {
    return NextResponse.json({ error: "Ese email ya está registrado." }, { status: 409 });
  }

  const { data: existingUsername } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (existingUsername) {
    return NextResponse.json({ error: "Ese nombre de usuario ya está en uso." }, { status: 409 });
  }

  const identity = { email, username };
  const role = enforceRoleForUser(identity, "participante");
  const paymentStatus = enforcePaymentStatusForUser(identity, "pending_review");

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      name,
      username,
      role: "participante",
    },
  });

  if (authError || !authData.user) {
    console.error("[register] auth.admin.createUser", authError);
    return NextResponse.json(
      { error: mapAuthErrorMessage(authError?.message) },
      { status: 400 },
    );
  }

  const authUserId = authData.user.id;

  const { error: profileError } = await supabase.from("profiles").insert({
    id: authUserId,
    name,
    email,
    username,
    role,
    payment_status: paymentStatus,
    created_at: new Date().toISOString(),
  });

  if (profileError) {
    console.error("[register] profile insert", profileError);

    if (!shouldBlockAdminDeletion(identity)) {
      await supabase.auth.admin.deleteUser(authUserId);
    }

    const msg = profileError.message.toLowerCase().includes("unique")
      ? "Ese email o usuario ya está registrado."
      : mapAuthErrorMessage(profileError.message);

    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    userId: authUserId,
    username,
    name,
    role: role === "admin" ? "admin" : "participante",
    paymentStatus,
    requiresEmailConfirmation: false,
  });
}
