"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useUsers } from "@/hooks/useUsers";
import {
  fetchLatestPaymentForUser,
  submitPaymentDeclaration,
  type PaymentRecord,
} from "@/lib/services/paymentService";

type PageStatus = "loading" | "needs_declaration" | "pending_review" | "approved" | "rejected";

export default function PagoPage() {
  const { user, isReady: isAuthReady } = useAuth();
  const { submitPaymentProof } = useUsers();

  const [latestPayment, setLatestPayment] = useState<PaymentRecord | null>(null);
  const [loadedForUserId, setLoadedForUserId] = useState<string | null>(null);
  const [payerName, setPayerName] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isLoadingRef = useRef(false);

  const loadLatestPayment = useCallback(async () => {
    if (!user || isLoadingRef.current) {
      return;
    }
    isLoadingRef.current = true;
    try {
      const record = await fetchLatestPaymentForUser(user.userId);
      setLatestPayment(record);
    } catch (loadError) {
      console.error("[pago] error cargando último payment", loadError);
      setLatestPayment(null);
    } finally {
      if (user) {
        setLoadedForUserId(user.userId);
      }
      isLoadingRef.current = false;
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      return;
    }
    let cancelled = false;
    void (async () => {
      await loadLatestPayment();
      if (cancelled) {
        return;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, loadLatestPayment]);

  const paymentLoaded = !user || loadedForUserId === user.userId;
  // Texto libre: NO se prellena con el nombre del usuario logueado. El que
  // hizo la transferencia puede ser otra persona (p.ej. un familiar), así
  // que el input arranca vacío.
  const payerNameValue = payerName;

  const pageStatus: PageStatus = useMemo(() => {
    if (!isAuthReady || !paymentLoaded) {
      return "loading";
    }
    if (!latestPayment) {
      return "needs_declaration";
    }
    if (latestPayment.status === "approved") {
      return "approved";
    }
    if (latestPayment.status === "rejected") {
      return "rejected";
    }
    if (latestPayment.status === "pending_review") {
      return "pending_review";
    }
    return "needs_declaration";
  }, [isAuthReady, paymentLoaded, latestPayment]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!user || user.role !== "participante") {
      setError("Iniciá sesión como participante para declarar tu pago.");
      return;
    }

    const cleanName = payerNameValue.trim();
    // Única validación: que no esté vacío. NO comparamos contra `user.name`
    // porque la transferencia puede haberla hecho otra persona (familiar,
    // amigo, etc.) y eso es válido.
    if (cleanName.length === 0) {
      setError("Ingresá el nombre de quien hizo la transferencia.");
      return;
    }

    setSubmitting(true);
    try {
      const proof = await submitPaymentDeclaration(user.userId, cleanName);
      if (!proof) {
        setError(
          "Supabase no está configurado en este entorno. Avisale al admin que revise las variables NEXT_PUBLIC_SUPABASE_*.",
        );
        return;
      }

      // Notifica al hook de usuarios para refrescar listas (admin, etc.).
      await submitPaymentProof(user.username, proof);
      // Refrescamos el último payment para que la UI cambie a "pendiente de revisión"
      // sin tener que recargar.
      await loadLatestPayment();
      setMessage("Listo. Tu declaración quedó pendiente de revisión por el admin.");
    } catch (paymentError) {
      console.error("[pago] error enviando declaración", paymentError);
      setError(
        paymentError instanceof Error
          ? paymentError.message
          : "No se pudo enviar tu declaración. Intentá de nuevo en unos minutos.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (isAuthReady && !user) {
    return (
      <main className="mx-auto w-full max-w-4xl px-5 py-16 sm:px-6 lg:px-8">
        <div className="fc-card p-8 text-center">
          <h1 className="fc-display-italic text-3xl uppercase tracking-[0.02em] text-white">
            Iniciá sesión para pagar
          </h1>
          <Link href="/login" className="fc-cta-fifa mt-6">
            <span aria-hidden>▸</span> Ir al login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-14 sm:px-6 lg:px-8">
      <section className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a1018] p-8">
        <div aria-hidden className="absolute inset-x-0 top-0 h-[2px] fc-flag-stripe opacity-90" />

        <div className="relative">
          <span className="fc-chip fc-chip-lime">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--fc-lime)] fc-pulse-dot-lime" />
            Inscripción
          </span>
          <h1 className="mt-4 fc-display-italic text-4xl uppercase leading-[0.92] tracking-[0.005em] text-white sm:text-5xl">
            Confirmá tu pago
          </h1>
          <p className="mt-4 max-w-2xl text-slate-300">
            Transferí el importe al alias indicado y, cuando termines, completá el nombre de
            quien hizo la transferencia. El admin revisa la declaración y te habilita.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {[
              ["Alias", "mundial.prode.mp"],
              ["Importe", "$10.000"],
              ["Titular", "Mateo Cottet"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="fc-broadcast-cut-sm relative flex flex-col gap-1 border border-[var(--fc-lime)]/22 bg-[var(--fc-lime)]/[0.04] p-5"
              >
                <div className="flex items-center gap-2">
                  <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--fc-lime)]" />
                  <p className="fc-display-italic text-[0.66rem] uppercase tracking-[0.22em] text-[var(--fc-lime)]">
                    {label}
                  </p>
                </div>
                <p className="fc-stencil text-3xl text-white">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-8">
            {pageStatus === "loading" ? (
              <LoadingState />
            ) : pageStatus === "approved" ? (
              <ApprovedState />
            ) : pageStatus === "pending_review" ? (
              <PendingReviewState payment={latestPayment} />
            ) : (
              <DeclarationForm
                status={pageStatus}
                latestPayment={latestPayment}
                payerName={payerNameValue}
                submitting={submitting}
                onPayerNameChange={setPayerName}
                onSubmit={handleSubmit}
              />
            )}
          </div>

          {error ? (
            <p className="fc-broadcast-cut-sm mt-4 border border-[var(--fc-magenta)]/40 bg-[var(--fc-magenta)]/10 px-4 py-3 text-sm font-bold text-[var(--fc-magenta)]">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="fc-broadcast-cut-sm mt-4 border border-[var(--fc-lime)]/40 bg-[var(--fc-lime)]/10 px-4 py-3 text-sm font-bold text-[var(--fc-lime)]">
              {message}
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function LoadingState() {
  return (
    <div className="fc-broadcast-cut-sm border border-white/[0.07] bg-[#070b13] p-5 text-sm text-slate-300">
      Cargando estado de tu pago…
    </div>
  );
}

function ApprovedState() {
  return (
    <div className="fc-broadcast-cut-sm relative flex flex-col items-start gap-4 border border-[var(--fc-lime)]/30 bg-[var(--fc-lime)]/[0.05] p-5">
      <span className="fc-chip fc-chip-lime">
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--fc-lime)]" />
        Pago aprobado
      </span>
      <p className="text-sm text-[var(--fc-lime)]/90">
        Tu inscripción quedó confirmada. Ya podés cargar tus predicciones.
      </p>
      <Link href="/partidos" className="fc-cta-fifa">
        <span aria-hidden>▸</span> Ir a predicciones
      </Link>
    </div>
  );
}

function PendingReviewState({ payment }: { payment: PaymentRecord | null }) {
  return (
    <div className="fc-broadcast-cut-sm relative border border-[var(--fc-yellow)]/30 bg-[var(--fc-yellow)]/[0.05] p-5 text-[var(--fc-yellow)]">
      <span className="fc-chip fc-chip-yellow">
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--fc-yellow)] fc-pulse-dot" />
        Pendiente de revisión
      </span>
      <p className="mt-3 fc-display-italic text-lg uppercase tracking-[0.04em] text-white">
        Tu declaración fue enviada.
      </p>
      {payment ? (
        <div className="fc-broadcast-cut-sm mt-3 space-y-1 border border-white/[0.07] bg-[#070b13] p-4 text-sm text-[var(--fc-yellow)]/90">
          {payment.payerName ? (
            <p>
              Pagador declarado:{" "}
              <span className="fc-display-italic font-bold text-white">{payment.payerName}</span>
            </p>
          ) : null}
          <p>Enviado: {new Date(payment.uploadedAt).toLocaleString()}</p>
        </div>
      ) : null}
      <p className="mt-3 text-sm text-[var(--fc-yellow)]/80">
        El admin revisa los pagos manualmente. Cuando lo apruebe, te habilitamos
        automáticamente para cargar tus predicciones.
      </p>
    </div>
  );
}

type DeclarationFormProps = {
  status: "needs_declaration" | "rejected";
  latestPayment: PaymentRecord | null;
  payerName: string;
  submitting: boolean;
  onPayerNameChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function DeclarationForm({
  status,
  latestPayment,
  payerName,
  submitting,
  onPayerNameChange,
  onSubmit,
}: DeclarationFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {status === "rejected" && latestPayment ? (
        <div className="fc-broadcast-cut-sm border border-[var(--fc-magenta)]/30 bg-[var(--fc-magenta)]/[0.06] p-5 text-sm text-[var(--fc-magenta)]">
          <p className="fc-display-italic text-base uppercase tracking-[0.04em] text-white">
            Tu declaración anterior fue rechazada.
          </p>
          {latestPayment.payerName ? (
            <p className="mt-2">
              Nombre informado: <span className="font-bold">{latestPayment.payerName}</span> ·{" "}
              {new Date(latestPayment.uploadedAt).toLocaleString()}
            </p>
          ) : null}
          <p className="mt-2">
            Confirmá el nombre de quien hizo la transferencia y volvé a enviarla a revisión.
          </p>
        </div>
      ) : null}

      <label className="block">
        <span className="fc-display-italic text-[0.7rem] uppercase tracking-[0.22em] text-[var(--fc-lime)]">
          Nombre de quien hizo la transferencia
        </span>
        <input
          type="text"
          value={payerName}
          onChange={(event) => onPayerNameChange(event.target.value)}
          placeholder="Nombre y apellido"
          disabled={submitting}
          autoComplete="name"
          className="mt-2 h-12 w-full border border-white/[0.07] bg-[#02050b]/85 px-4 text-white outline-none transition placeholder:text-slate-500 hover:border-white/15 focus:border-[var(--fc-lime)] focus:ring-4 focus:ring-[var(--fc-lime)]/15 disabled:opacity-60 fc-broadcast-cut-sm"
        />
        <span className="mt-2 block text-xs text-slate-400">
          Puede ser tu nombre o el de otra persona, por ejemplo un familiar. El admin
          lo usa para identificar tu pago.
        </span>
      </label>

      <button
        type="submit"
        disabled={submitting || payerName.trim().length === 0}
        className="fc-cta-fifa"
      >
        {submitting ? (
          <>
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
            Enviando…
          </>
        ) : (
          <>
            <span aria-hidden>▸</span> Ya pagué
          </>
        )}
      </button>
    </form>
  );
}
