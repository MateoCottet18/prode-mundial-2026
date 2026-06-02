import { absoluteUrl } from "@/lib/services/emailService";

/**
 * Templates HTML + texto plano para los emails automáticos.
 *
 * Pensados para ser:
 *   - Server-only (importar desde `/app/api/**`).
 *   - Compatibles con la mayoría de clientes (Gmail, Outlook web, iOS Mail):
 *     tabla central de 600px, estilos inline, sin webfonts.
 *   - Ligeros (los emails más pesados son los que clientes filtran como
 *     spam).
 *
 * Mantienen la identidad visual del sitio sin replicar la complejidad: una
 * tabla oscura, tipografía system, acento lima FIFA y CTA contrastado.
 */

const PAYMENT_DETAILS = {
  alias: "mundial.prode.mp",
  titular: "Mateo Cottet",
  importe: "$10.000",
} as const;

type WelcomeInput = {
  name: string;
  username: string;
};

export function buildWelcomeEmail({ name, username }: WelcomeInput) {
  const payUrl = absoluteUrl("/pago");
  const subject = "¡Te registraste en el Prode Mundial 2026!";

  const text = [
    `Hola ${name || username},`,
    "",
    "Te registraste correctamente en el Prode Mundial 2026.",
    "",
    "Para confirmar tu inscripción, transferí $10.000:",
    `  - Alias: ${PAYMENT_DETAILS.alias}`,
    `  - Titular: ${PAYMENT_DETAILS.titular}`,
    `  - Importe: ${PAYMENT_DETAILS.importe}`,
    "",
    "Después entrá a /pago e ingresá el nombre de quien hizo la transferencia.",
    `Link directo: ${payUrl}`,
    "",
    "Una vez que aprobemos tu pago vas a poder cargar tus predicciones.",
    "",
    "¡Suerte!",
    "Prode Mundial 2026",
  ].join("\n");

  const html = layout({
    preheader: `Transferí $10.000 al alias ${PAYMENT_DETAILS.alias} para confirmar tu inscripción.`,
    overline: "Bienvenida al Prode",
    title: `Hola ${escapeHtml(name || username)},`,
    body: `
      <p style="margin:0 0 16px 0;font-size:15px;line-height:1.55;color:#cbd5f5;">
        Te registraste correctamente. Para confirmar tu inscripción al Prode Mundial 2026
        transferí <strong style="color:#ffffff;">${PAYMENT_DETAILS.importe}</strong> a
        los siguientes datos:
      </p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
             style="margin:0 0 24px 0;border-collapse:collapse;background:#0a1018;border:1px solid #1f2937;">
        <tbody>
          ${detailRow("Alias", PAYMENT_DETAILS.alias)}
          ${detailRow("Titular", PAYMENT_DETAILS.titular)}
          ${detailRow("Importe", PAYMENT_DETAILS.importe, true)}
        </tbody>
      </table>
      <p style="margin:0 0 24px 0;font-size:15px;line-height:1.55;color:#cbd5f5;">
        Cuando termines la transferencia, entrá a la sección de pago e ingresá
        el nombre de quien hizo la transferencia (puede ser tu nombre o el de
        otra persona, por ejemplo un familiar).
      </p>
    `,
    cta: { label: "Ir a /pago", href: payUrl },
    footer:
      "Si vos no creaste esta cuenta, podés ignorar este mensaje. Nadie obtiene acceso hasta que se apruebe el pago.",
  });

  return { subject, html, text };
}

type PaymentApprovedInput = {
  name: string;
  username: string;
};

export function buildPaymentApprovedEmail({ name, username }: PaymentApprovedInput) {
  const partidosUrl = absoluteUrl("/partidos");
  const subject = "Tu pago fue aprobado · Prode Mundial 2026";

  const text = [
    `Hola ${name || username},`,
    "",
    "¡Tu pago fue aprobado!",
    "Ya podés cargar tus predicciones del Mundial 2026.",
    "",
    `Entrá acá: ${partidosUrl}`,
    "",
    "Recordá que cada predicción se puede editar hasta el inicio del partido.",
    "",
    "¡Suerte con tus pronósticos!",
    "Prode Mundial 2026",
  ].join("\n");

  const html = layout({
    preheader: "Ya podés cargar tus predicciones del Mundial 2026.",
    overline: "Pago aprobado",
    title: `Hola ${escapeHtml(name || username)},`,
    body: `
      <p style="margin:0 0 16px 0;font-size:15px;line-height:1.55;color:#cbd5f5;">
        ¡Tu pago fue aprobado! Ya podés entrar a cargar tus predicciones del
        Mundial 2026.
      </p>
      <p style="margin:0 0 24px 0;font-size:15px;line-height:1.55;color:#cbd5f5;">
        Recordá que cada predicción se puede editar hasta el inicio del partido.
        Después del kickoff queda bloqueada.
      </p>
    `,
    cta: { label: "Cargar predicciones", href: partidosUrl },
    footer: "Si tenés dudas, respondé a este mail y te respondemos.",
  });

  return { subject, html, text };
}

// -----------------------------------------------------------------------------
// Layout interno
// -----------------------------------------------------------------------------

type LayoutInput = {
  preheader: string;
  overline: string;
  title: string;
  body: string;
  cta: { label: string; href: string };
  footer: string;
};

function layout({ preheader, overline, title, body, cta, footer }: LayoutInput): string {
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="color-scheme" content="dark light" />
    <title>Prode Mundial 2026</title>
  </head>
  <body style="margin:0;padding:0;background:#02040a;color:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <span style="display:none!important;visibility:hidden;mso-hide:all;color:transparent;height:0;width:0;overflow:hidden;">${escapeHtml(preheader)}</span>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#02040a;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0"
                 style="max-width:600px;width:100%;background:#070b13;border:1px solid #1f2937;">
            <tr>
              <td style="padding:24px 28px 8px 28px;border-bottom:1px solid #1f2937;">
                <p style="margin:0;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#d4ff3f;">
                  ${escapeHtml(overline)}
                </p>
                <p style="margin:6px 0 0 0;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;color:#94a3b8;">
                  Prode Mundial 2026
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 28px 8px 28px;">
                <h1 style="margin:0 0 16px 0;font-size:22px;line-height:1.3;color:#ffffff;font-weight:700;">
                  ${title}
                </h1>
                ${body}
                <table role="presentation" cellspacing="0" cellpadding="0" style="margin:8px 0 16px 0;">
                  <tr>
                    <td>
                      <a href="${escapeAttr(cta.href)}"
                         style="display:inline-block;padding:12px 22px;background:#d4ff3f;color:#0b0f1a;
                                font-weight:700;text-decoration:none;font-size:14px;letter-spacing:0.08em;
                                text-transform:uppercase;">
                        ${escapeHtml(cta.label)}
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px 24px 28px;border-top:1px solid #1f2937;">
                <p style="margin:0;font-size:12px;line-height:1.55;color:#64748b;">
                  ${escapeHtml(footer)}
                </p>
              </td>
            </tr>
          </table>
          <p style="margin:18px 0 0 0;font-size:11px;color:#475569;letter-spacing:0.08em;text-transform:uppercase;">
            Prode Mundial 2026 · México · USA · Canadá
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function detailRow(label: string, value: string, highlight = false): string {
  return `
    <tr>
      <td style="padding:12px 16px;border-bottom:1px solid #1f2937;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#94a3b8;width:35%;">
        ${escapeHtml(label)}
      </td>
      <td style="padding:12px 16px;border-bottom:1px solid #1f2937;font-size:${highlight ? "18px" : "15px"};color:${highlight ? "#d4ff3f" : "#ffffff"};font-weight:${highlight ? "700" : "600"};font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;">
        ${escapeHtml(value)}
      </td>
    </tr>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttr(value: string): string {
  return escapeHtml(value);
}
