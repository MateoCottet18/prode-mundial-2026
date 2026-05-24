import { mapAuthErrorMessage } from "@/lib/authErrors";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { TimeoutError, withTimeout } from "@/lib/withTimeout";
import type { SessionUser } from "@/lib/prode";
import { createProfile, mapProfileRole } from "@/lib/services/profileService";

export type RegisterInput = {
  name: string;
  email: string;
  username: string;
  password: string;
};

export type RegisterResult = SessionUser & {
  requiresEmailConfirmation: boolean;
  debug: {
    supabaseConfigured: boolean;
    authUserCreated: boolean;
    authUserId?: string;
    signUpError?: string;
    profileCreated: boolean;
    profileStatusCode?: number;
    profileError?: string;
    registrationPath?: "server" | "client";
  };
};

export async function registerWithSupabase(input: RegisterInput) {
  const debug = {
    supabaseConfigured: isSupabaseConfigured(),
    authUserCreated: false,
    authUserId: undefined as string | undefined,
    signUpError: undefined as string | undefined,
    profileCreated: false,
    profileStatusCode: undefined as number | undefined,
    profileError: undefined as string | undefined,
    registrationPath: undefined as "server" | "client" | undefined,
  };

  if (!debug.supabaseConfigured) {
    console.error("error de variables env faltantes", {
      supabaseUrlExists: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      anonKeyExists: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    });
    return null;
  }

  const normalizedEmail = input.email.trim().toLowerCase();
  const normalizedUsername = input.username.trim().toLowerCase();

  // Prefer server registration: no confirmation email, no rate limit on SMTP.
  try {
    const serverResult = await registerViaServerApi({
      name: input.name.trim(),
      email: normalizedEmail,
      username: normalizedUsername,
      password: input.password,
    });

    if (serverResult) {
      debug.registrationPath = "server";
      debug.authUserCreated = true;
      debug.authUserId = serverResult.userId;
      debug.profileCreated = true;

      const session = await loginWithSupabase(normalizedEmail, input.password);
      if (session) {
        return {
          ...session,
          requiresEmailConfirmation: false,
          debug,
        } satisfies RegisterResult;
      }

      return {
        userId: serverResult.userId,
        username: serverResult.username,
        name: serverResult.name,
        role: serverResult.role,
        paymentStatus: serverResult.paymentStatus,
        requiresEmailConfirmation: false,
        debug,
      } satisfies RegisterResult;
    }
  } catch (serverError) {
    const useClient =
      typeof serverError === "object" &&
      serverError !== null &&
      "useClientSignup" in serverError &&
      (serverError as { useClientSignup?: boolean }).useClientSignup;

    if (!useClient) {
      const message =
        serverError instanceof Error
          ? serverError.message
          : "No se pudo registrar el usuario.";
      debug.signUpError = message;
      throw Object.assign(new Error(message), { debug });
    }
  }

  // Fallback: client signUp (puede enviar email si Confirm email está ON).
  return registerViaClientSignUp(input, normalizedEmail, normalizedUsername, debug);
}

async function registerViaServerApi(input: RegisterInput) {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const data = (await response.json()) as {
    ok?: boolean;
    error?: string;
    useClientSignup?: boolean;
    userId?: string;
    username?: string;
    name?: string;
    role?: "participante" | "admin";
    paymentStatus?: SessionUser["paymentStatus"];
  };

  if (response.status === 503 && data.useClientSignup) {
    throw Object.assign(new Error("server unavailable"), { useClientSignup: true });
  }

  if (!response.ok) {
    throw Object.assign(new Error(mapAuthErrorMessage(data.error)), { status: response.status });
  }

  return {
    userId: data.userId!,
    username: data.username!,
    name: data.name!,
    role: (data.role ?? "participante") as SessionUser["role"],
    paymentStatus: (data.paymentStatus ?? "pending") as SessionUser["paymentStatus"],
  };
}

async function registerViaClientSignUp(
  input: RegisterInput,
  normalizedEmail: string,
  normalizedUsername: string,
  debug: RegisterResult["debug"],
) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return null;
  }

  debug.registrationPath = "client";

  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password: input.password,
    options: {
      data: {
        name: input.name,
        username: normalizedUsername,
        role: "participante",
      },
    },
  });

  if (error || !data.user) {
    console.error("error creando auth user (client signUp)", error);
    const friendly = mapAuthErrorMessage(error?.message);
    debug.signUpError = friendly;
    throw Object.assign(new Error(friendly), { debug });
  }

  debug.authUserCreated = true;
  debug.authUserId = data.user.id;

  try {
    const profileResponse = await createProfile({
      id: data.user.id,
      name: input.name,
      email: normalizedEmail,
      username: normalizedUsername,
    });
    debug.profileCreated = true;
    debug.profileStatusCode = profileResponse.status;
  } catch (profileError) {
    const message =
      profileError instanceof Error ? profileError.message : "No se pudo crear el perfil.";
    console.error("auth user creado pero falló profile", {
      authUserId: data.user.id,
      error: message,
    });
    debug.profileError = message;
    throw Object.assign(
      new Error(`Se creó el usuario en Auth pero falló el perfil: ${mapAuthErrorMessage(message)}`),
      { debug },
    );
  }

  const requiresEmailConfirmation = !data.session;

  if (!requiresEmailConfirmation) {
    const session = await loginWithSupabase(normalizedEmail, input.password);
    if (session) {
      return { ...session, requiresEmailConfirmation: false, debug } satisfies RegisterResult;
    }
  }

  return {
    userId: data.user.id,
    username: normalizedUsername,
    name: input.name,
    role: "participante",
    paymentStatus: "pending",
    requiresEmailConfirmation,
    debug,
  } satisfies RegisterResult;
}

export type LoginFailureCode =
  | "user_not_found"
  | "invalid_password"
  | "email_not_confirmed"
  | "profile_missing"
  | "lookup_error"
  | "auth_error"
  | "timeout"
  | "unknown";

export type LoginFailedStep =
  | "find-username"
  | "find-email"
  | "sign-in"
  | "read-profile"
  | "config"
  | "unknown";

// 30s por paso, 90s total: cubre cualquier red lenta sin colgarse.
const LOGIN_STEP_TIMEOUT_MS = 30_000;
const LOGIN_TOTAL_TIMEOUT_MS = 90_000;

const LOGIN_TIMEOUT_MESSAGE =
  "No pudimos iniciar sesión. Revisá tu conexión o intentá de nuevo.";

async function loginStep<T>(
  promise: Promise<T>,
  label: LoginFailedStep,
): Promise<T> {
  try {
    return await withTimeout(promise, LOGIN_STEP_TIMEOUT_MS, label);
  } catch (error) {
    if (error instanceof TimeoutError) {
      console.error(`[login] timeout en paso: ${label}`);
      throw new LoginFailure("timeout", LOGIN_TIMEOUT_MESSAGE, label);
    }
    throw error;
  }
}

export class LoginFailure extends Error {
  code: LoginFailureCode;
  failedStep: LoginFailedStep;
  cause?: unknown;

  constructor(
    code: LoginFailureCode,
    message: string,
    failedStep: LoginFailedStep = "unknown",
    cause?: unknown,
  ) {
    super(message);
    this.name = "LoginFailure";
    this.code = code;
    this.failedStep = failedStep;
    this.cause = cause;
  }
}

class LookupError extends Error {
  constructor(public readonly reason: unknown) {
    super("profile lookup failed");
  }
}

/**
 * Logs in via Supabase Auth using either an email or a username.
 *
 * Returns `null` if Supabase is not configured (caller can fall back).
 * Throws `LoginFailure` with a typed `code` for any expected failure:
 *  - "user_not_found"     : the email/username has no matching profile
 *  - "invalid_password"   : email exists but the password is wrong
 *  - "email_not_confirmed": Supabase requires email confirmation first
 *  - "profile_missing"    : auth user exists but public.profiles row is missing
 *  - "unknown"            : any other auth error
 */
export async function loginWithSupabase(identifier: string, password: string) {
  return withTimeout(
    loginWithSupabaseInternal(identifier, password),
    LOGIN_TOTAL_TIMEOUT_MS,
    "login-total",
  ).catch((error) => {
    if (error instanceof TimeoutError) {
      console.error("[login] timeout total", error.label);
      throw new LoginFailure("timeout", LOGIN_TIMEOUT_MESSAGE);
    }
    throw error;
  });
}

async function loginWithSupabaseInternal(identifier: string, password: string) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    console.warn("[login] Supabase no configurado");
    throw new LoginFailure(
      "unknown",
      "Supabase no está configurado en este entorno.",
      "config",
    );
  }

  const normalized = identifier.trim().toLowerCase();
  let email: string | null = null;

  const lookupStep: LoginFailedStep = normalized.includes("@")
    ? "find-email"
    : "find-username";

  try {
    console.log("[login] paso 1: resolve-identifier vía API…", normalized);
    email = await loginStep(resolveIdentifierViaApi(normalized), lookupStep);
    console.log("[login] paso 1: resultado lookup =", email ? maskEmailForLog(email) : null);
  } catch (lookupError) {
    if (lookupError instanceof LoginFailure) {
      throw lookupError;
    }
    if (lookupError instanceof LookupError) {
      console.error(
        "[login] paso 1: error consultando profiles",
        lookupError.reason,
      );
      throw new LoginFailure(
        "lookup_error",
        "No pudimos consultar la base de usuarios. Revisá tu conexión o intentá de nuevo.",
        normalized.includes("@") ? "find-email" : "find-username",
        lookupError.reason,
      );
    }
    throw lookupError;
  }

  if (!email) {
    throw new LoginFailure(
      "user_not_found",
      "Usuario no encontrado.",
      normalized.includes("@") ? "find-email" : "find-username",
    );
  }

  console.log("[login] paso 2: signInWithPassword(", email, ") …");
  let { data, error } = await loginStep(
    supabase.auth.signInWithPassword({ email, password }),
    "sign-in",
  );

  // Auto-confirm: si Supabase dice "email_not_confirmed", llamamos al endpoint
  // server-side (`/api/auth/confirm-email`) que usa service role para marcar
  // `email_confirmed_at` y reintentamos el sign-in UNA sola vez. Esto cubre el
  // caso de usuarios viejos creados antes de que el registro server-side con
  // `email_confirm: true` fuera el camino estándar. No reintentamos para otros
  // errores (contraseña inválida, etc.) para evitar loops y leaks.
  if (error && !data?.user) {
    const message = error.message?.toLowerCase() ?? "";
    if (message.includes("not confirmed") || message.includes("email_not_confirmed")) {
      console.warn("[login] email no confirmado, intentando auto-confirm…");
      const confirmed = await tryAutoConfirmEmail(email);
      if (confirmed) {
        console.log("[login] auto-confirm OK, reintentando signInWithPassword…");
        const retry = await loginStep(
          supabase.auth.signInWithPassword({ email, password }),
          "sign-in",
        );
        data = retry.data;
        error = retry.error;
      }
    }
  }

  if (error || !data.user) {
    const message = error?.message?.toLowerCase() ?? "";
    console.error("[login] paso 2: signInWithPassword falló", error?.message);
    if (message.includes("not confirmed") || message.includes("email_not_confirmed")) {
      throw new LoginFailure(
        "email_not_confirmed",
        "Tenés que confirmar tu email antes de iniciar sesión.",
        "sign-in",
        error?.message,
      );
    }
    if (
      message.includes("invalid login") ||
      message.includes("invalid credentials") ||
      message.includes("invalid password")
    ) {
      throw new LoginFailure(
        "invalid_password",
        "Contraseña incorrecta.",
        "sign-in",
        error?.message,
      );
    }
    // Cualquier otro error de auth: distinto a "contraseña mal".
    throw new LoginFailure(
      "auth_error",
      error?.message
        ? `Supabase Auth devolvió un error: ${error.message}`
        : "Falló la autenticación.",
      "sign-in",
      error?.message,
    );
  }

  if (data.session) {
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
    if (sessionError) {
      console.warn("[login] setSession warning", sessionError.message);
    } else {
      console.log("[login] sesión Auth aplicada en cliente");
    }
  }

  console.log("[login] paso 3: leyendo profile de", data.user.id, "…");
  const session = await loginStep(
    getSessionUserFromSupabase(data.user.id, data.session?.access_token),
    "read-profile",
  );

  if (!session) {
    console.error("[login] paso 3: profile no encontrado para", data.user.id);
    throw new LoginFailure(
      "profile_missing",
      "Tu usuario existe en Auth pero no tiene perfil en la tabla `profiles`.",
      "read-profile",
    );
  }

  console.log(
    "[login] paso 4: sesión lista →",
    session.username,
    "role:",
    session.role,
    "payment:",
    session.paymentStatus,
  );
  return session;
}

export async function getSessionUserFromSupabase(
  userId?: string,
  accessToken?: string,
) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    console.warn("[read-profile] Supabase no configurado");
    return null;
  }

  let id = userId;
  let token = accessToken;

  if (!id || !token) {
    const { data: sessionData } = await supabase.auth.getSession();
    id = id ?? sessionData.session?.user?.id;
    token = token ?? sessionData.session?.access_token;
  }

  if (!id) {
    console.warn("[read-profile] sin user id");
    return null;
  }

  console.log("[read-profile] query iniciada", id, "token:", Boolean(token));

  // 1) Cliente autenticado (respeta RLS: auth.uid() = id)
  const { data, error } = await supabase
    .from("profiles")
    .select("id,name,username,role,payment_status")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    const denied =
      error.code === "42501" ||
      /policy|permission|row-level|RLS/i.test(error.message);
    if (denied) {
      console.error("[read-profile] policy denied", error.code, error.message);
    } else {
      console.error("[read-profile] error", error.code, error.message);
    }
  } else if (data) {
    console.log("[read-profile] profile encontrado", data.username, data.role);
    return {
      userId: data.id,
      username: data.username,
      name: data.name,
      role: mapProfileRole(data.role),
      paymentStatus: data.payment_status,
    } satisfies SessionUser;
  } else {
    console.warn("[read-profile] sin fila (cliente) para", id);
  }

  // 2) Respaldo server-side con JWT validado (mientras RLS se aplica en Supabase)
  if (token) {
    return getSessionUserViaApi(token);
  }

  return null;
}

async function getSessionUserViaApi(accessToken: string): Promise<SessionUser | null> {
  console.log("[read-profile] fallback API server…");

  let response: Response;
  try {
    response = await fetch("/api/auth/my-profile", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });
  } catch (networkError) {
    console.error("[read-profile] fetch my-profile falló", networkError);
    return null;
  }

  const body = (await response.json().catch(() => ({}))) as {
    found?: boolean;
    user?: SessionUser;
    error?: string;
  };

  if (response.ok && body.found && body.user) {
    console.log("[read-profile] profile encontrado (API)", body.user.username);
    return body.user;
  }

  if (response.status === 401) {
    console.error("[read-profile] policy denied / token inválido (API)");
  } else {
    console.error("[read-profile] API error", response.status, body.error);
  }

  return null;
}

export async function logoutFromSupabase() {
  const supabase = getSupabaseClient();
  await supabase?.auth.signOut();
}

export function canUseSupabaseAuth() {
  return isSupabaseConfigured();
}

/**
 * Resuelve username/email → email de Auth usando API server-side (service role).
 * No consulta `profiles` con el cliente anon (evita RLS/timeouts en login).
 */
async function resolveIdentifierViaApi(identifier: string): Promise<string | null> {
  const normalized = identifier.trim().toLowerCase();
  console.log("[resolve-identifier] buscando...", normalized);

  const params = new URLSearchParams({ identifier: normalized });
  let response: Response;

  try {
    response = await fetch(`/api/auth/resolve-identifier?${params.toString()}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
  } catch (networkError) {
    console.error("[resolve-identifier] fetch falló", networkError);
    throw new LookupError(networkError);
  }

  const body = (await response.json().catch(() => ({}))) as {
    found?: boolean;
    email?: string;
    error?: string;
    source?: string;
  };

  if (response.ok && body.found && body.email) {
    const email = String(body.email).trim().toLowerCase();
    console.log(
      "[resolve-identifier] encontrado...",
      body.source === "fallback" ? "(fallback email)" : "",
      maskEmailForLog(email),
    );
    return email;
  }

  if (response.status === 404) {
    console.log("[resolve-identifier] no encontrado:", normalized);
    return null;
  }

  console.error(
    "[resolve-identifier] error HTTP",
    response.status,
    body.error ?? response.statusText,
  );
  throw new LookupError(body.error ?? `http_${response.status}`);
}

function maskEmailForLog(email: string) {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  return `${local?.slice(0, 2) ?? ""}***@${domain}`;
}

/**
 * Llama a `/api/auth/confirm-email` (server-side, service role) para forzar
 * `email_confirmed_at` en `auth.users`. Devuelve `true` si quedó confirmado
 * (incluye el caso `noop` donde ya lo estaba). No tira excepciones: cualquier
 * fallo de red o 4xx/5xx devuelve `false` y dejamos que el flujo de login
 * arroje la `LoginFailure` original.
 */
async function tryAutoConfirmEmail(email: string): Promise<boolean> {
  try {
    const response = await fetch("/api/auth/confirm-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
      cache: "no-store",
    });
    const body = (await response.json().catch(() => ({}))) as {
      ok?: boolean;
      action?: string;
      message?: string;
    };
    if (response.ok && body.ok && (body.action === "confirmed" || body.action === "noop")) {
      return true;
    }
    console.warn(
      "[login] auto-confirm no aplicado",
      response.status,
      body.action,
      body.message,
    );
    return false;
  } catch (err) {
    console.warn("[login] auto-confirm error de red", err);
    return false;
  }
}
