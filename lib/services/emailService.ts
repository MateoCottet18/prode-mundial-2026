/**
 * Email service (server-only).
 *
 * Usa la API HTTP de Resend (sin SDK) para mantener el bundle chico y no
 * sumar dependencias. El módulo está pensado para llamarse SOLO desde rutas
 * `/app/api/**`. Nunca importar desde un componente cliente: leería
 * `RESEND_API_KEY`, que es server-only.
 *
 * Diseño:
 *   - `sendEmail(...)` es BEST-EFFORT: nunca tira excepción, devuelve un
 *     `EmailDispatchResult`. Si Resend falla o la key falta, lo loguea como
 *     warning y devuelve `{ ok: false }`. Los callers (registro / aprobación
 *     de pago) NO deben cancelar su flujo si el mail falla.
 *   - El `from` se toma de `RESEND_FROM`. Si falta, default
 *     `Prode Mundial <onboarding@resend.dev>` (válido en sandbox de Resend
 *     hasta verificar dominio propio).
 *   - `appUrl` para los CTAs sale de `APP_URL` o, si no está, intenta
 *     `NEXT_PUBLIC_APP_URL`. Si no hay ninguna, los links quedan relativos.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const DEFAULT_FROM = "Prode Mundial <onboarding@resend.dev>";

export type EmailDispatchResult =
  | { ok: true; id: string }
  | { ok: false; reason: "not_configured" | "send_failed"; message: string };

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Tag opcional para tracking en Resend. */
  tag?: string;
};

export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export function getAppUrl(): string {
  const fromServer = process.env.APP_URL?.trim();
  if (fromServer) {
    return fromServer.replace(/\/$/, "");
  }
  const fromPublic = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromPublic) {
    return fromPublic.replace(/\/$/, "");
  }
  return "";
}

/**
 * Construye una URL absoluta a una ruta interna de la app si tenemos APP_URL.
 * Si no, devuelve el path tal cual (los clientes de email modernos lo
 * ignoran como link, por eso preferimos URL absoluta en producción).
 */
export function absoluteUrl(path: string): string {
  const base = getAppUrl();
  if (!base) {
    return path;
  }
  if (!path.startsWith("/")) {
    return `${base}/${path}`;
  }
  return `${base}${path}`;
}

export async function sendEmail(input: SendEmailInput): Promise<EmailDispatchResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(
      "[email] RESEND_API_KEY no configurada — se omite envío",
      { to: maskEmailForLog(input.to), subject: input.subject },
    );
    return { ok: false, reason: "not_configured", message: "RESEND_API_KEY ausente." };
  }

  const from = process.env.RESEND_FROM?.trim() || DEFAULT_FROM;

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
        tags: input.tag ? [{ name: "category", value: input.tag }] : undefined,
      }),
    });

    const body = (await response.json().catch(() => ({}))) as {
      id?: string;
      message?: string;
      name?: string;
    };

    if (!response.ok) {
      console.warn("[email] Resend respondió error", {
        status: response.status,
        name: body.name,
        message: body.message,
        to: maskEmailForLog(input.to),
        subject: input.subject,
      });
      return {
        ok: false,
        reason: "send_failed",
        message: body.message ?? `HTTP ${response.status}`,
      };
    }

    console.log("[email] enviado OK", {
      id: body.id,
      to: maskEmailForLog(input.to),
      subject: input.subject,
      tag: input.tag,
    });
    return { ok: true, id: body.id ?? "" };
  } catch (error) {
    console.warn("[email] excepción al enviar", {
      error: error instanceof Error ? error.message : String(error),
      to: maskEmailForLog(input.to),
      subject: input.subject,
    });
    return {
      ok: false,
      reason: "send_failed",
      message: error instanceof Error ? error.message : "Error de red.",
    };
  }
}

function maskEmailForLog(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  return `${(local ?? "").slice(0, 2)}***@${domain}`;
}
