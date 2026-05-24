import { NextResponse } from "next/server";
import { getSupabaseAdminClient, isSupabaseServiceRoleConfigured } from "@/lib/supabase/server";

/**
 * Auto-confirma `email_confirmed_at` en `auth.users` para un email dado.
 *
 * Útil para entornos de dev donde Supabase tiene "Confirm email" activado y
 * algunos usuarios quedaron creados sin confirmar (por ejemplo, los hechos
 * desde el dashboard antes de que `auth.admin.createUser` con `email_confirm:
 * true` fuera el camino estándar). Sin esto, esos usuarios no pueden
 * iniciar sesión hasta que clickeen el link del mail.
 *
 * Idempotente: si ya estaba confirmado, devuelve `noop`.
 *
 * Gating:
 *  - Requiere `SUPABASE_SERVICE_ROLE_KEY`.
 *  - En `NODE_ENV !== production`, está habilitado.
 *  - En producción, requiere `ENABLE_ADMIN_REPAIR=1` (mismo flag que el
 *    endpoint de reparación de admin) para evitar que se use como vector
 *    de evasión de confirmación de email en deploys reales.
 */

type ConfirmBody = { email?: string };

type ConfirmResult = {
  ok: boolean;
  action: "confirmed" | "noop" | "not_found" | "disabled" | "error";
  message: string;
  email?: string;
  userId?: string;
};

function isEnabled() {
  if (process.env.NODE_ENV !== "production") return true;
  return process.env.ENABLE_ADMIN_REPAIR === "1";
}

async function findAuthUserByEmail(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  targetEmail: string,
) {
  if (!supabase) return null;
  const target = targetEmail.trim().toLowerCase();
  const perPage = 200;
  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error("[confirm-email] listUsers error", error);
      return null;
    }
    const match = data.users.find(
      (user) => (user.email ?? "").trim().toLowerCase() === target,
    );
    if (match) return match;
    if (data.users.length < perPage) {
      return null;
    }
  }
  return null;
}

export async function POST(request: Request) {
  if (!isEnabled()) {
    return NextResponse.json<ConfirmResult>(
      {
        ok: false,
        action: "disabled",
        message:
          "Endpoint deshabilitado en producción. Configurá ENABLE_ADMIN_REPAIR=1 si querés permitir auto-confirm.",
      },
      { status: 404 },
    );
  }

  if (!isSupabaseServiceRoleConfigured()) {
    return NextResponse.json<ConfirmResult>(
      {
        ok: false,
        action: "error",
        message: "Falta SUPABASE_SERVICE_ROLE_KEY en el entorno del servidor.",
      },
      { status: 500 },
    );
  }

  let body: ConfirmBody;
  try {
    body = (await request.json()) as ConfirmBody;
  } catch {
    return NextResponse.json<ConfirmResult>(
      { ok: false, action: "error", message: "Cuerpo JSON inválido." },
      { status: 400 },
    );
  }

  const email = body.email?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json<ConfirmResult>(
      { ok: false, action: "error", message: "Email inválido." },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json<ConfirmResult>(
      { ok: false, action: "error", message: "No se pudo construir el cliente Supabase." },
      { status: 500 },
    );
  }

  const authUser = await findAuthUserByEmail(supabase, email);
  if (!authUser) {
    return NextResponse.json<ConfirmResult>(
      { ok: false, action: "not_found", message: "No existe ningún auth user con ese email.", email },
      { status: 404 },
    );
  }

  if (authUser.email_confirmed_at) {
    return NextResponse.json<ConfirmResult>({
      ok: true,
      action: "noop",
      message: "El email ya estaba confirmado.",
      email,
      userId: authUser.id,
    });
  }

  const { error: updateError } = await supabase.auth.admin.updateUserById(authUser.id, {
    email_confirm: true,
  });

  if (updateError) {
    console.error("[confirm-email] updateUserById error", updateError);
    return NextResponse.json<ConfirmResult>(
      {
        ok: false,
        action: "error",
        message: `No se pudo confirmar el email: ${updateError.message}`,
        email,
        userId: authUser.id,
      },
      { status: 500 },
    );
  }

  console.log("[confirm-email] auto-confirmado", email);
  return NextResponse.json<ConfirmResult>({
    ok: true,
    action: "confirmed",
    message: "Email auto-confirmado en Supabase Auth.",
    email,
    userId: authUser.id,
  });
}
