import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import {
  enforcePaymentStatusForUser,
  enforceRoleForUser,
  isAdminUser,
} from "@/lib/admin";
import { getSupabaseAdminClient, isSupabaseServiceRoleConfigured } from "@/lib/supabase/server";

type TestDbBody = {
  name?: string;
  email?: string;
};

function envFlags() {
  return {
    supabaseUrlExists: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    serviceRoleExists: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  };
}

function jsonError(
  status: number,
  payload: {
    error: string;
    details?: string | null;
    hint?: string | null;
    code?: string | null;
    step?: "auth_signup" | "profile_insert" | "rollback" | "validation" | "config";
    authUserId?: string | null;
    rolledBack?: boolean;
    attemptedRow?: Record<string, unknown>;
    stack?: string;
  },
) {
  return NextResponse.json({ ok: false, ...envFlags(), ...payload }, { status });
}

/** Test endpoint is disabled in production unless ENABLE_TEST_DB=1 is set. */
function isTestEndpointEnabled() {
  if (process.env.ENABLE_TEST_DB === "1") {
    return true;
  }
  return process.env.NODE_ENV !== "production";
}

/**
 * /test-db proof: create the auth user first, then the matching profile row.
 * - profiles.id is FK to auth.users(id), so we MUST get the id from Supabase Auth.
 * - Uses the admin client (service role) so it bypasses RLS for this test endpoint.
 * - If profile insert fails, the auth user is deleted to avoid orphans in auth.users.
 * - In production the endpoint returns 404 unless ENABLE_TEST_DB=1 is set.
 */
export async function POST(request: Request) {
  if (!isTestEndpointEnabled()) {
    return NextResponse.json(
      { ok: false, error: "Endpoint deshabilitado en producción." },
      { status: 404 },
    );
  }

  let authUserId: string | null = null;
  let rolledBack = false;

  try {
    if (!isSupabaseServiceRoleConfigured()) {
      return jsonError(500, {
        step: "config",
        error: "Faltan variables de entorno de Supabase en el servidor.",
      });
    }

    let body: TestDbBody;
    try {
      body = (await request.json()) as TestDbBody;
    } catch {
      return jsonError(400, { step: "validation", error: "JSON inválido en el body." });
    }

    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();

    if (!name || !email) {
      return jsonError(400, {
        step: "validation",
        error: "Faltan campos obligatorios: name y email.",
      });
    }

    const at = email.indexOf("@");
    if (at <= 0) {
      return jsonError(400, { step: "validation", error: "Email inválido." });
    }
    const username = email.slice(0, at);

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return jsonError(500, {
        step: "config",
        error: "No se pudo crear el cliente admin de Supabase.",
      });
    }

    // Admin protection: if this user is the configured admin (by email or
    // username) we lock role to "admin" and payment_status to "approved" before
    // any insert/rollback runs.
    const identity = { email, username };
    const effectiveRole = enforceRoleForUser(identity, "participante");
    const effectivePaymentStatus = enforcePaymentStatusForUser(identity, "pending_review");
    const isProtectedAdmin = isAdminUser(identity);

    // 1) Create the Supabase Auth user (writes to auth.users). We email_confirm=true
    //    so the test does not need an inbox round-trip. A strong random password is
    //    generated server-side because /test-db has no password field.
    const tempPassword = randomBytes(24).toString("base64url");

    const { data: created, error: signUpError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        name,
        username,
        role: effectiveRole,
      },
    });

    if (signUpError || !created?.user?.id) {
      console.error("[/api/test-db] auth.admin.createUser error", signUpError);
      return jsonError(500, {
        step: "auth_signup",
        error: signUpError?.message ?? "No se pudo crear el usuario en Supabase Auth.",
        code: signUpError?.code ?? null,
      });
    }

    authUserId = created.user.id;

    // 2) Insert the profile using the auth user id (matches profiles_id_fkey).
    const row = {
      id: authUserId,
      name,
      email,
      username,
      role: effectiveRole,
      payment_status: effectivePaymentStatus,
      created_at: new Date().toISOString(),
    };

    const { data: profile, error: insertError } = await supabase
      .from("profiles")
      .insert(row)
      .select("id,name,email,username,role,payment_status,created_at")
      .single();

    if (insertError) {
      console.error("[/api/test-db] profile insert error", {
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code,
        attemptedRow: row,
      });

      // Rollback the auth user so we don't leave orphan rows in auth.users.
      // BUT never delete the configured admin account, even if the test failed.
      if (isProtectedAdmin) {
        console.warn(
          "[/api/test-db] admin email detected — skipping rollback to protect the admin account",
          { authUserId, email },
        );
        rolledBack = false;
      } else {
        const { error: deleteError } = await supabase.auth.admin.deleteUser(authUserId);
        rolledBack = !deleteError;
        if (deleteError) {
          console.error("[/api/test-db] rollback auth.admin.deleteUser error", deleteError);
        }
      }

      return jsonError(500, {
        step: "profile_insert",
        error: insertError.message,
        details: insertError.details ?? null,
        hint: insertError.hint ?? null,
        code: insertError.code ?? null,
        attemptedRow: row,
        authUserId,
        rolledBack,
      });
    }

    return NextResponse.json({ ok: true, authUserId, profile });
  } catch (unexpected) {
    const message =
      unexpected instanceof Error ? unexpected.message : "Error inesperado en /api/test-db";
    const stack = unexpected instanceof Error ? unexpected.stack : undefined;

    console.error("[/api/test-db] unhandled error", unexpected);

    // Best-effort rollback if we already created the auth user — but never delete
    // the configured admin email, even from the catch-all error handler.
    if (authUserId && !rolledBack) {
      try {
        const supabase = getSupabaseAdminClient();
        if (supabase) {
          // Look up the auth user to decide whether it is the protected admin.
          const { data: lookup } = await supabase.auth.admin.getUserById(authUserId);
          const lookupEmail = lookup?.user?.email ?? null;
          const lookupUsername =
            (lookup?.user?.user_metadata as { username?: string } | null)?.username ?? null;
          if (isAdminUser({ email: lookupEmail, username: lookupUsername })) {
            console.warn(
              "[/api/test-db] catch-all rollback skipped: protected admin account",
              { authUserId, email: lookupEmail },
            );
          } else {
            await supabase.auth.admin.deleteUser(authUserId);
            rolledBack = true;
          }
        }
      } catch (rollbackError) {
        console.error("[/api/test-db] rollback failed", rollbackError);
      }
    }

    return jsonError(500, {
      step: "rollback",
      error: message,
      authUserId,
      rolledBack,
      ...(process.env.NODE_ENV === "development" && stack ? { stack } : {}),
    });
  }
}
