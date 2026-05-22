import { NextResponse } from "next/server";
import {
  ADMIN_EMAIL,
  ADMIN_USERNAME,
} from "@/lib/admin";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

/**
 * One-shot, idempotent repair endpoint for the protected admin profile.
 *
 * - Looks up the auth.users row whose email matches `ADMIN_EMAIL`.
 * - Ensures a public.profiles row exists for that id with:
 *     username = ADMIN_USERNAME (e.g. "mateocottet")
 *     name     = "Mateo Cottet" (or body.name)
 *     role     = "admin"
 *     payment_status = "approved"
 *     email    = the canonical email from auth.users
 * - Reports back what was found and what was changed, including the real email.
 *
 * Gated to non-production environments OR when ENABLE_ADMIN_REPAIR=1.
 * Always uses the service role key on the server side (never exposed to client).
 */

const HARDCODED_ADMIN_NAME = "Mateo Cottet";

function isEnabled() {
  if (process.env.NODE_ENV !== "production") return true;
  return process.env.ENABLE_ADMIN_REPAIR === "1";
}

type RepairReport = {
  ok: boolean;
  action: "created" | "updated" | "noop" | "conflict" | "error";
  message: string;
  authUserId?: string;
  email?: string;
  username?: string;
  authAction?: "found" | "created" | "password_reset";
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  envFlags: {
    supabaseUrlExists: boolean;
    serviceRoleExists: boolean;
    adminEmailConfigured: boolean;
    adminUsernameConfigured: boolean;
  };
};

async function readPassword(request: Request): Promise<string | null> {
  // Accept password from JSON body or ?password=... query string.
  const url = new URL(request.url);
  const fromQuery = url.searchParams.get("password");
  if (fromQuery) return fromQuery;

  if (request.method === "POST") {
    try {
      const contentType = request.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        const body = (await request.json()) as { password?: unknown };
        if (typeof body?.password === "string" && body.password.length > 0) {
          return body.password;
        }
      }
    } catch {
      // ignore body parse errors
    }
  }
  return null;
}

async function handleRepair(request: Request): Promise<NextResponse<RepairReport>> {
  const envFlags = {
    supabaseUrlExists: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    serviceRoleExists: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    adminEmailConfigured: Boolean(ADMIN_EMAIL),
    adminUsernameConfigured: Boolean(ADMIN_USERNAME),
  };

  if (!isEnabled()) {
    return NextResponse.json(
      {
        ok: false,
        action: "error",
        message:
          "Endpoint deshabilitado en producción. Configurá ENABLE_ADMIN_REPAIR=1 para usarlo.",
        envFlags,
      },
      { status: 404 },
    );
  }

  if (!envFlags.supabaseUrlExists || !envFlags.serviceRoleExists) {
    return NextResponse.json(
      {
        ok: false,
        action: "error",
        message:
          "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno del servidor.",
        envFlags,
      },
      { status: 500 },
    );
  }

  if (!envFlags.adminEmailConfigured || !envFlags.adminUsernameConfigured) {
    return NextResponse.json(
      {
        ok: false,
        action: "error",
        message: "Faltan ADMIN_EMAIL o ADMIN_USERNAME en el entorno del servidor.",
        envFlags,
      },
      { status: 500 },
    );
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json(
      {
        ok: false,
        action: "error",
        message: "No se pudo construir el cliente Supabase con service role.",
        envFlags,
      },
      { status: 500 },
    );
  }

  const providedPassword = await readPassword(request);

  // 1. Find (or create) the auth.users row whose email matches ADMIN_EMAIL.
  let authUser = await findAuthUserByEmail(supabase, ADMIN_EMAIL);
  let authAction: "found" | "created" | "password_reset" = "found";

  if (!authUser) {
    if (!providedPassword) {
      return NextResponse.json(
        {
          ok: false,
          action: "error",
          message: `No existe ningún auth user con email "${ADMIN_EMAIL}". Volvé a llamar a este endpoint con { "password": "..." } en el body (o ?password=...) para que lo cree automáticamente.`,
          envFlags,
          email: ADMIN_EMAIL,
          username: ADMIN_USERNAME,
        },
        { status: 404 },
      );
    }
    const { data: created, error: createError } =
      await supabase.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: providedPassword,
        email_confirm: true,
        user_metadata: { name: HARDCODED_ADMIN_NAME, role: "admin" },
      });
    if (createError || !created.user) {
      return NextResponse.json(
        {
          ok: false,
          action: "error",
          message: `No se pudo crear el auth user: ${createError?.message ?? "desconocido"}`,
          envFlags,
          email: ADMIN_EMAIL,
          username: ADMIN_USERNAME,
        },
        { status: 500 },
      );
    }
    authUser = created.user;
    authAction = "created";
  } else if (providedPassword) {
    // Reset the password to the provided value so the documented credential works.
    const { error: pwError } = await supabase.auth.admin.updateUserById(
      authUser.id,
      { password: providedPassword, email_confirm: true },
    );
    if (pwError) {
      return NextResponse.json(
        {
          ok: false,
          action: "error",
          message: `No se pudo resetear la contraseña del auth user: ${pwError.message}`,
          envFlags,
          email: ADMIN_EMAIL,
          username: ADMIN_USERNAME,
          authUserId: authUser.id,
        },
        { status: 500 },
      );
    }
    authAction = "password_reset";
  }

  const canonicalEmail = (authUser.email ?? ADMIN_EMAIL).toLowerCase();
  const authUserId = authUser.id;

  // 2. Check if a profile already exists for this auth user id.
  const { data: existingById, error: byIdError } = await supabase
    .from("profiles")
    .select("id,name,email,username,role,payment_status")
    .eq("id", authUserId)
    .maybeSingle();

  if (byIdError) {
    return NextResponse.json(
      {
        ok: false,
        action: "error",
        message: `Error consultando profiles por id: ${byIdError.message}`,
        envFlags,
        authUserId,
        email: canonicalEmail,
      },
      { status: 500 },
    );
  }

  // 3. Check if some other profile already uses the admin username.
  const { data: existingByUsername, error: byUsernameError } = await supabase
    .from("profiles")
    .select("id,name,email,username,role,payment_status")
    .eq("username", ADMIN_USERNAME)
    .maybeSingle();

  if (byUsernameError) {
    return NextResponse.json(
      {
        ok: false,
        action: "error",
        message: `Error consultando profiles por username: ${byUsernameError.message}`,
        envFlags,
        authUserId,
        email: canonicalEmail,
      },
      { status: 500 },
    );
  }

  if (
    existingByUsername &&
    existingByUsername.id !== authUserId
  ) {
    return NextResponse.json(
      {
        ok: false,
        action: "conflict",
        message: `El username "${ADMIN_USERNAME}" ya está tomado por otro perfil (id=${existingByUsername.id}). Resolvelo manualmente antes de continuar.`,
        envFlags,
        authUserId,
        email: canonicalEmail,
        username: ADMIN_USERNAME,
        before: existingByUsername,
      },
      { status: 409 },
    );
  }

  const desiredRow = {
    id: authUserId,
    name: HARDCODED_ADMIN_NAME,
    email: canonicalEmail,
    username: ADMIN_USERNAME,
    role: "admin",
    payment_status: "approved",
  };

  if (!existingById) {
    // 4a. Insert new profile.
    const { data: inserted, error: insertError } = await supabase
      .from("profiles")
      .insert(desiredRow)
      .select("id,name,email,username,role,payment_status")
      .single();

    if (insertError) {
      return NextResponse.json(
        {
          ok: false,
          action: "error",
          message: `No se pudo crear el profile: ${insertError.message}`,
          envFlags,
          authUserId,
          email: canonicalEmail,
          username: ADMIN_USERNAME,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      action: "created",
      message: `Profile creado para ${canonicalEmail} con username "${ADMIN_USERNAME}".`,
      envFlags,
      authUserId,
      email: canonicalEmail,
      username: ADMIN_USERNAME,
      authAction,
      before: null,
      after: inserted,
    });
  }

  // 4b. Update existing profile (only if any field actually differs).
  const fieldsChanged =
    existingById.name !== HARDCODED_ADMIN_NAME ||
    (existingById.email ?? "").toLowerCase() !== canonicalEmail ||
    existingById.username !== ADMIN_USERNAME ||
    existingById.role !== "admin" ||
    existingById.payment_status !== "approved";

  if (!fieldsChanged) {
    return NextResponse.json({
      ok: true,
      action: "noop",
      message:
        authAction === "password_reset"
          ? "Profile ya estaba correcto. Se reseteó la contraseña del auth user."
          : "El profile del admin ya estaba correcto. Nada que cambiar.",
      envFlags,
      authUserId,
      email: canonicalEmail,
      username: ADMIN_USERNAME,
      authAction,
      before: existingById,
      after: existingById,
    });
  }

  const { data: updated, error: updateError } = await supabase
    .from("profiles")
    .update({
      name: HARDCODED_ADMIN_NAME,
      email: canonicalEmail,
      username: ADMIN_USERNAME,
      role: "admin",
      payment_status: "approved",
    })
    .eq("id", authUserId)
    .select("id,name,email,username,role,payment_status")
    .single();

  if (updateError) {
    return NextResponse.json(
      {
        ok: false,
        action: "error",
        message: `No se pudo actualizar el profile: ${updateError.message}`,
        envFlags,
        authUserId,
        email: canonicalEmail,
        username: ADMIN_USERNAME,
        before: existingById,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    action: "updated",
    message: "Profile del admin actualizado correctamente.",
    envFlags,
    authUserId,
    email: canonicalEmail,
    username: ADMIN_USERNAME,
    authAction,
    before: existingById,
    after: updated,
  });
}

/**
 * Searches auth.users for the row whose email matches `targetEmail` (case-insensitive).
 * Iterates pages of `listUsers` until found or exhausted.
 */
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
      console.error("[repair-admin] listUsers error", error);
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

export async function GET(request: Request) {
  return handleRepair(request);
}

export async function POST(request: Request) {
  return handleRepair(request);
}
