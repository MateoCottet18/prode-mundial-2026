import { getSupabaseClient } from "@/lib/supabase/client";
import type { PaymentProof, PaymentStatus } from "@/lib/prode";

/**
 * Servicio de pagos.
 *
 * Flujo nuevo (sin archivo / sin Storage):
 *   - El usuario va a /pago, ingresa `payer_name` (quien hizo la transferencia)
 *     y aprieta "Ya pagué".
 *   - Insertamos una fila en `public.payments` con `status = 'pending_review'`,
 *     `payer_name`, `uploaded_at = now()`.
 *   - Marcamos `profiles.payment_status = 'pending_review'`.
 *   - El admin ve `payer_name` en "Revisión de pagos" y aprueba o rechaza.
 *
 * Las columnas `file_name / file_size / file_type / storage_path` ya están en
 * la tabla pero quedan nullables (legacy). No las usamos en inserts nuevos.
 *
 * Fuente de verdad: `public.payments`. La página `/pago` decide qué mostrar
 * con `fetchLatestPaymentForUser` (no con `profiles.payment_status`, porque
 * éste arranca en 'pending' antes de que el usuario declare nada).
 */

export type PaymentRecord = {
  id: string;
  userId: string;
  payerName: string | null;
  status: PaymentStatus;
  uploadedAt: string;
  reviewedAt: string | null;
  /** Legacy — sólo se completa para filas históricas con comprobante. */
  fileName: string | null;
  fileSize: number | null;
  fileType: string | null;
  storagePath: string | null;
};

const PAYMENT_SELECT =
  "id,user_id,payer_name,file_name,file_size,file_type,storage_path,status,uploaded_at,reviewed_at";

/**
 * Devuelve el último payment del usuario (o null si nunca declaró pago).
 * Devuelve `null` también si Supabase no está configurado.
 */
export async function fetchLatestPaymentForUser(
  userId: string,
): Promise<PaymentRecord | null> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("payments")
    .select(PAYMENT_SELECT)
    .eq("user_id", userId)
    .order("uploaded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[paymentService] error leyendo último payment", error.message);
    return null;
  }

  if (!data) {
    return null;
  }

  return mapPaymentRow(data);
}

/**
 * Devuelve el último payment de cada uno de los `userIds`.
 * Útil para el admin: trae payer_name + status para mostrar al lado de cada
 * profile sin tener que pegarle a payments por usuario.
 */
export async function fetchLatestPaymentsByUserIds(
  userIds: string[],
): Promise<Record<string, PaymentRecord>> {
  const supabase = getSupabaseClient();
  if (!supabase || userIds.length === 0) {
    return {};
  }

  // Postgres no nos da DISTINCT ON desde supabase-js. Traemos todo y filtramos
  // en memoria. La cantidad de payments es chica (un par por usuario, máximo).
  const { data, error } = await supabase
    .from("payments")
    .select(PAYMENT_SELECT)
    .in("user_id", userIds)
    .order("uploaded_at", { ascending: false });

  if (error) {
    console.error("[paymentService] error listando payments", error.message);
    return {};
  }

  const latestByUser: Record<string, PaymentRecord> = {};
  for (const row of data ?? []) {
    if (!latestByUser[row.user_id]) {
      latestByUser[row.user_id] = mapPaymentRow(row);
    }
  }
  return latestByUser;
}

/**
 * Inserta una fila en `public.payments` con `payer_name` + `pending_review`
 * y actualiza `profiles.payment_status` para reflejarlo en la sesión.
 *
 * Devuelve un `PaymentProof` para que la UI pueda mostrar el estado sin
 * volver a hacer round-trip; la fuente real sigue siendo `fetchLatestPaymentForUser`.
 */
export async function submitPaymentDeclaration(
  userId: string,
  payerName: string,
): Promise<PaymentProof | null> {
  const supabase = getSupabaseClient();
  const uploadedAt = new Date().toISOString();
  const cleanName = payerName.trim();

  if (!supabase) {
    return null;
  }

  if (!cleanName) {
    throw new Error("Ingresá el nombre de quien hizo la transferencia.");
  }

  const { error } = await supabase.from("payments").insert({
    user_id: userId,
    payer_name: cleanName,
    status: "pending_review",
    uploaded_at: uploadedAt,
  });

  if (error) {
    throw new Error(error.message);
  }

  await supabase
    .from("profiles")
    .update({ payment_status: "pending_review" })
    .eq("id", userId);

  return {
    payerName: cleanName,
    uploadedAt,
    status: "pending_review",
  } satisfies PaymentProof;
}

/**
 * Actualiza el status del payment más reciente del usuario.
 * Lo usa el admin al aprobar/rechazar para que `payments.status` quede
 * sincronizado con `profiles.payment_status`. No falla silencioso si no
 * existe payment: simplemente no hace nada (puede pasar si el admin marca
 * como approved a alguien que pagó por fuera).
 */
export async function updateLatestPaymentStatus(
  userId: string,
  status: PaymentStatus,
) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return;
  }

  const latest = await fetchLatestPaymentForUser(userId);
  if (!latest) {
    return;
  }

  const { error } = await supabase
    .from("payments")
    .update({
      status,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", latest.id);

  if (error) {
    console.error("[paymentService] error actualizando payment status", error.message);
  }
}

/**
 * Best-effort: avisa al usuario que su pago fue aprobado.
 *
 * - Sólo se llama cuando el admin marca como `approved`.
 * - Lleva el JWT del admin para que el endpoint server-side valide rol
 *   antes de mandar el email.
 * - Si falla (Resend caído / sin configurar / red), loguea warning y
 *   devuelve `false`. NO interrumpe el flujo del admin.
 */
export async function notifyPaymentApproved(userId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return false;
  }

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      console.warn(
        "[paymentService] sin access token para notificar aprobación",
      );
      return false;
    }

    const response = await fetch("/api/admin/notify-payment-approved", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ userId }),
    });

    const body = (await response.json().catch(() => ({}))) as {
      ok?: boolean;
      emailSent?: boolean;
      reason?: string;
      error?: string;
    };

    if (!response.ok) {
      console.warn(
        "[paymentService] notify-payment-approved respondió error",
        response.status,
        body.error ?? body.reason,
      );
      return false;
    }

    return Boolean(body.emailSent);
  } catch (error) {
    console.warn("[paymentService] excepción notificando aprobación", error);
    return false;
  }
}

// -----------------------------------------------------------------------------
// Internals
// -----------------------------------------------------------------------------

type PaymentRowFromDb = {
  id: string;
  user_id: string;
  payer_name: string | null;
  file_name: string | null;
  file_size: number | null;
  file_type: string | null;
  storage_path: string | null;
  status: string;
  uploaded_at: string;
  reviewed_at: string | null;
};

function mapPaymentRow(row: PaymentRowFromDb): PaymentRecord {
  return {
    id: row.id,
    userId: row.user_id,
    payerName: row.payer_name,
    fileName: row.file_name,
    fileSize: row.file_size,
    fileType: row.file_type,
    storagePath: row.storage_path,
    status: row.status as PaymentStatus,
    uploadedAt: row.uploaded_at,
    reviewedAt: row.reviewed_at,
  };
}
