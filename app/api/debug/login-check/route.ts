import { NextResponse } from "next/server";
import {
  ADMIN_EMAIL,
  ADMIN_USERNAME,
  isAdminUser,
} from "@/lib/admin";
import {
  getSupabaseAdminClient,
  isSupabaseServiceRoleConfigured,
} from "@/lib/supabase/server";

/**
 * GET /api/debug/login-check?identifier=<email o username>
 *
 * Endpoint TEMPORAL de diagnóstico. Verifica server-side, sin necesidad de
 * password:
 *   1. ¿Existe un profile con ese username/email?
 *   2. ¿Existe el auth user correspondiente?
 *   3. ¿role / payment_status son los esperados?
 *   4. ¿Hay duplicados que puedan estar rompiendo el lookup?
 *
 * Nunca expone passwords ni tokens; sólo metadata.
 *
 * Gated igual que /api/admin/repair-admin: habilitado en dev o cuando
 * ENABLE_ADMIN_REPAIR=1 (mismo flag, ya está documentado).
 */

function isEnabled() {
  if (process.env.NODE_ENV !== "production") return true;
  return process.env.ENABLE_ADMIN_REPAIR === "1";
}

type DebugReport = {
  ok: boolean;
  identifier: string;
  resolved: {
    type: "email" | "username" | "unknown";
    value: string;
  };
  profile: null | {
    id: string;
    name: string;
    username: string;
    email: string;
    role: string;
    payment_status: string;
    created_at: string;
    expectedAdmin: boolean;
    rolePaymentOk: boolean;
  };
  profileLookupError?: string;
  duplicateUsernameCount?: number;
  duplicateEmailCount?: number;
  authUser: null | {
    id: string;
    email: string | null;
    emailConfirmedAt: string | null;
    lastSignInAt: string | null;
    profileMatchesAuthId: boolean;
  };
  authLookupError?: string;
  envFlags: {
    supabaseUrlExists: boolean;
    serviceRoleExists: boolean;
    adminEmailConfigured: boolean;
    adminUsernameConfigured: boolean;
  };
  checks: {
    profileFound: boolean;
    authUserFound: boolean;
    profileIdMatchesAuth: boolean;
    expectedAdminEnforced: boolean;
  };
  hint?: string;
};

export async function GET(request: Request) {
  const envFlags = {
    supabaseUrlExists: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    serviceRoleExists: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    adminEmailConfigured: Boolean(ADMIN_EMAIL),
    adminUsernameConfigured: Boolean(ADMIN_USERNAME),
  };

  if (!isEnabled()) {
    return NextResponse.json(
      { error: "Endpoint deshabilitado en producción.", envFlags },
      { status: 404 },
    );
  }

  if (!isSupabaseServiceRoleConfigured()) {
    return NextResponse.json(
      {
        error:
          "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el servidor.",
        envFlags,
      },
      { status: 500 },
    );
  }

  const url = new URL(request.url);
  const identifierRaw =
    url.searchParams.get("identifier") ??
    url.searchParams.get("username") ??
    url.searchParams.get("email") ??
    "";
  const identifier = identifierRaw.trim().toLowerCase();

  if (!identifier) {
    return NextResponse.json(
      { error: "Pasá ?identifier=<username o email>.", envFlags },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "No se pudo construir el cliente service role.", envFlags },
      { status: 500 },
    );
  }

  const resolvedType: "email" | "username" | "unknown" = identifier.includes("@")
    ? "email"
    : "username";

  const report: DebugReport = {
    ok: false,
    identifier,
    resolved: { type: resolvedType, value: identifier },
    profile: null,
    authUser: null,
    envFlags,
    checks: {
      profileFound: false,
      authUserFound: false,
      profileIdMatchesAuth: false,
      expectedAdminEnforced: false,
    },
  };

  // 1) Buscar profile por username o email.
  const column = resolvedType === "email" ? "email" : "username";
  const { data: profileRow, error: profileError } = await supabase
    .from("profiles")
    .select("id,name,username,email,role,payment_status,created_at")
    .eq(column, identifier)
    .maybeSingle();

  if (profileError) {
    report.profileLookupError = profileError.message;
  }

  // 2) Contar duplicados (por las dudas).
  const [{ count: dupUsername }, { count: dupEmail }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("username", identifier),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("email", identifier),
  ]);
  report.duplicateUsernameCount = dupUsername ?? 0;
  report.duplicateEmailCount = dupEmail ?? 0;

  let authUser: Awaited<
    ReturnType<typeof supabase.auth.admin.listUsers>
  >["data"]["users"][number] | null = null;

  if (profileRow) {
    const identity = { email: profileRow.email, username: profileRow.username };
    const expectedAdmin = isAdminUser(identity);
    const rolePaymentOk = expectedAdmin
      ? profileRow.role === "admin" && profileRow.payment_status === "approved"
      : true;

    report.profile = {
      id: profileRow.id,
      name: profileRow.name,
      username: profileRow.username,
      email: profileRow.email,
      role: profileRow.role,
      payment_status: profileRow.payment_status,
      created_at: profileRow.created_at,
      expectedAdmin,
      rolePaymentOk,
    };
    report.checks.profileFound = true;
    report.checks.expectedAdminEnforced = expectedAdmin ? rolePaymentOk : true;
    report.resolved.value = profileRow.email;

    // 3) Validar que el auth.user con ese id realmente existe.
    try {
      const { data: authResult, error: authErr } =
        await supabase.auth.admin.getUserById(profileRow.id);
      if (authErr) {
        report.authLookupError = authErr.message;
      } else if (authResult?.user) {
        authUser = authResult.user;
      }
    } catch (err) {
      report.authLookupError =
        err instanceof Error ? err.message : "error en auth.admin.getUserById";
    }
  } else {
    // No profile → intentamos verificar si igual existe un auth.user con ese email.
    if (resolvedType === "email") {
      try {
        const found = await findAuthUserByEmail(supabase, identifier);
        if (found) authUser = found;
      } catch (err) {
        report.authLookupError =
          err instanceof Error ? err.message : "error buscando auth user";
      }
    }
  }

  if (authUser) {
    report.authUser = {
      id: authUser.id,
      email: authUser.email ?? null,
      emailConfirmedAt: authUser.email_confirmed_at ?? null,
      lastSignInAt: authUser.last_sign_in_at ?? null,
      profileMatchesAuthId: report.profile?.id === authUser.id,
    };
    report.checks.authUserFound = true;
    report.checks.profileIdMatchesAuth = report.profile?.id === authUser.id;
  }

  // Hint final para guiar al admin.
  if (!report.profile && !report.authUser) {
    report.hint =
      "Ese identifier no existe ni en `profiles` ni en `auth.users`. Verificá que el usuario haya sido creado.";
  } else if (report.profile && !report.authUser) {
    report.hint =
      "El profile existe pero NO hay auth user con ese id. El login por Auth va a fallar. Corré POST /api/admin/repair-admin si es el admin protegido.";
  } else if (!report.profile && report.authUser) {
    report.hint =
      "Hay un auth user pero NO hay profile correspondiente. Hay que crear la fila en `public.profiles` con id = auth.users.id.";
  } else if (report.profile && report.authUser && !report.checks.profileIdMatchesAuth) {
    report.hint =
      "El id del profile NO coincide con el id de auth.users. Borrá el profile huérfano y volvé a registrar (o usá repair-admin si es el admin).";
  } else if (report.profile?.expectedAdmin && !report.profile.rolePaymentOk) {
    report.hint =
      "Es el admin protegido pero role o payment_status no son los esperados. Corré POST /api/admin/repair-admin.";
  } else if (
    report.duplicateUsernameCount && report.duplicateUsernameCount > 1
  ) {
    report.hint = `Hay ${report.duplicateUsernameCount} profiles con el mismo username — eliminá los duplicados.`;
  } else if (report.duplicateEmailCount && report.duplicateEmailCount > 1) {
    report.hint = `Hay ${report.duplicateEmailCount} profiles con el mismo email — eliminá los duplicados.`;
  }

  report.ok = Boolean(
    report.profile &&
      report.authUser &&
      report.checks.profileIdMatchesAuth &&
      report.checks.expectedAdminEnforced,
  );

  return NextResponse.json(report);
}

async function findAuthUserByEmail(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  targetEmail: string,
) {
  const target = targetEmail.trim().toLowerCase();
  const perPage = 200;
  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) {
      throw error;
    }
    const match = data.users.find(
      (user) => (user.email ?? "").trim().toLowerCase() === target,
    );
    if (match) return match;
    if (data.users.length < perPage) return null;
  }
  return null;
}
