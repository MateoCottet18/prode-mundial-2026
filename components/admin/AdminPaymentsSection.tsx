"use client";

import type { AppUser, PaymentStatus } from "@/lib/prode";

type Props = {
  registeredUsers: AppUser[];
  onApprove: (idOrUsername: string) => void;
  onReject: (idOrUsername: string) => void;
};

const STATUS_META: Record<
  PaymentStatus,
  { label: string; chip: string; dot: string }
> = {
  approved: {
    label: "Aprobado",
    chip: "border-emerald-300/40 bg-emerald-300/10 text-emerald-100",
    dot: "bg-emerald-300",
  },
  rejected: {
    label: "Rechazado",
    chip: "border-red-300/40 bg-red-300/10 text-red-100",
    dot: "bg-red-300",
  },
  pending_review: {
    label: "En revisión",
    chip: "border-cyan-300/40 bg-cyan-300/10 text-cyan-100",
    dot: "bg-cyan-300 fc-pulse-dot",
  },
  pending: {
    label: "Sin declaración",
    chip: "border-amber-300/40 bg-amber-300/10 text-amber-100",
    dot: "bg-amber-300",
  },
};

/**
 * Cards de revisión de pagos.
 *
 * El flujo nuevo NO incluye archivo: el usuario sólo declara `payer_name`
 * (nombre de quien hizo la transferencia) y aprieta "Ya pagué". Acá mostramos
 * ese nombre + el timestamp + botones aprobar/rechazar.
 *
 * Para usuarios viejos que tienen un comprobante histórico (file_name), lo
 * mostramos abajo como referencia.
 */
export function AdminPaymentsSection({ registeredUsers, onApprove, onReject }: Props) {
  if (!registeredUsers.length) {
    return (
      <div className="rounded-2xl border border-white/[0.07] bg-slate-950/55 p-4 text-sm text-slate-300">
        Todavía no hay usuarios registrados desde la página de registro.
      </div>
    );
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {registeredUsers.map((registeredUser) => {
        const meta = STATUS_META[registeredUser.paymentStatus] ?? STATUS_META.pending;
        const proof = registeredUser.paymentProof;
        const payerName = proof?.payerName ?? "";
        const submittedAt = proof?.uploadedAt ?? "";
        const legacyFile = proof?.fileName ?? "";

        return (
          <article
            key={registeredUser.username}
            className="fc-card flex flex-col gap-3 p-4 transition-colors hover:border-emerald-300/20"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="fc-display truncate text-base uppercase tracking-[0.04em] text-white">
                  {registeredUser.displayName}
                </p>
                <p className="truncate text-xs text-slate-400">@{registeredUser.username}</p>
              </div>
              <span
                className={`fc-display inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.65rem] uppercase tracking-[0.18em] ${meta.chip}`}
              >
                <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                {meta.label}
              </span>
            </div>

            <div className="rounded-xl border border-white/[0.07] bg-black/30 p-3 text-xs text-slate-300">
              {payerName ? (
                <>
                  <p className="fc-overline text-[0.6rem] text-emerald-200">
                    Pagador declarado
                  </p>
                  <p className="mt-1 fc-display text-sm uppercase tracking-[0.04em] text-white">
                    {payerName}
                  </p>
                  {submittedAt ? (
                    <p className="mt-1 text-[0.7rem] text-slate-500">
                      Enviado: {new Date(submittedAt).toLocaleString()}
                    </p>
                  ) : null}
                  {legacyFile ? (
                    <p className="mt-2 break-all text-[0.7rem] text-slate-500">
                      Comprobante histórico: {legacyFile}
                    </p>
                  ) : null}
                </>
              ) : legacyFile ? (
                <>
                  <p className="fc-overline text-[0.6rem] text-amber-200">
                    Pago histórico (con comprobante)
                  </p>
                  <p className="mt-1 break-all text-sm font-bold text-emerald-100">
                    {legacyFile}
                  </p>
                  {submittedAt ? (
                    <p className="mt-1 text-[0.7rem] text-slate-500">
                      Enviado: {new Date(submittedAt).toLocaleString()}
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="text-slate-400">Sin declaración cargada.</p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onApprove(registeredUser.id ?? registeredUser.username)}
                className="fc-display rounded-md border border-emerald-300/40 bg-emerald-300/15 px-4 py-1.5 text-[0.7rem] uppercase tracking-[0.16em] text-emerald-50 transition-colors hover:bg-emerald-300/25"
              >
                Aprobar
              </button>
              <button
                type="button"
                onClick={() => onReject(registeredUser.id ?? registeredUser.username)}
                className="fc-display rounded-md border border-red-300/30 bg-red-300/10 px-4 py-1.5 text-[0.7rem] uppercase tracking-[0.16em] text-red-100 transition-colors hover:bg-red-300/20"
              >
                Rechazar
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
