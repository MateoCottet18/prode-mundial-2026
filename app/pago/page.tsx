"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useUsers } from "@/hooks/useUsers";

export default function PagoPage() {
  const { user, isReady } = useAuth();
  const { isReady: areUsersReady, submitPaymentProof } = useUsers();
  const [receipt, setReceipt] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleReceiptChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setReceipt(file);
    setError("");

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Subí una imagen del comprobante.");
      setReceipt(null);
      return;
    }

    setMessage(`Comprobante cargado: ${file.name}`);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!user || user.role !== "participante") {
      setError("Iniciá sesión como participante para cargar el comprobante.");
      return;
    }

    if (!receipt) {
      setError("Subí una imagen del comprobante para enviar el pago a revisión.");
      return;
    }

    submitPaymentProof(user.username, {
      fileName: receipt.name,
      fileType: receipt.type,
      fileSize: receipt.size,
      uploadedAt: new Date().toISOString(),
      status: "pending_review",
    });
    setMessage("Comprobante enviado. Tu pago quedó pendiente de revisión.");
  };

  if (isReady && !user) {
    return (
      <main className="mx-auto w-full max-w-4xl px-5 py-16 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-8 text-center shadow-2xl shadow-black/20">
          <h1 className="text-3xl font-black text-white">Iniciá sesión para pagar</h1>
          <Link
            href="/login"
            className="mt-6 inline-flex rounded-full bg-emerald-300 px-6 py-3 font-black text-slate-950 shadow-lg shadow-emerald-950/20 transition hover:-translate-y-0.5"
          >
            Ir al login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-14 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.075] to-white/[0.035] p-8 shadow-2xl shadow-black/20">
        <p className="text-sm font-bold uppercase tracking-[0.28em] text-emerald-200">
          Pago manual
        </p>
        <h1 className="mt-3 text-3xl font-black text-white sm:text-4xl">
          Pagá tu inscripción
        </h1>
        <p className="mt-4 max-w-2xl text-slate-300">
          Transferí el importe al alias indicado y subí una imagen del comprobante. El admin lo
          revisa y, cuando lo aprueba, tu usuario queda habilitado para jugar.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            ["Alias", "mateo.cottet"],
            ["Importe", "$10.000"],
            ["Titular", "Mateo Cottet"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-3xl border border-emerald-300/20 bg-emerald-300/10 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-200">
                {label}
              </p>
              <p className="mt-2 text-2xl font-black text-white">{value}</p>
            </div>
          ))}
        </div>

        {user?.paymentStatus === "approved" ? (
          <Link
            href="/partidos"
            className="mt-8 inline-flex rounded-full bg-emerald-300 px-6 py-3 font-black text-slate-950 shadow-lg shadow-emerald-950/20 transition hover:-translate-y-0.5"
          >
            Ya estás habilitado para jugar
          </Link>
        ) : user?.paymentStatus === "pending_review" ? (
          <div className="mt-8 rounded-3xl border border-amber-300/25 bg-amber-300/10 p-5 text-amber-100">
            Tu comprobante ya fue enviado y está pendiente de revisión.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <label className="block">
              <span className="text-sm font-bold text-slate-200">Comprobante de pago</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleReceiptChange}
                className="mt-2 w-full rounded-2xl border border-white/15 bg-slate-950/85 px-4 py-3 text-sm text-slate-200 file:mr-4 file:rounded-full file:border-0 file:bg-emerald-300 file:px-4 file:py-2 file:font-black file:text-slate-950 hover:border-white/25"
              />
            </label>

            {receipt ? (
              <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4 text-sm font-bold text-emerald-100">
                Comprobante cargado: {receipt.name}
              </div>
            ) : null}

            <label className="block">
              <span className="text-sm font-bold text-slate-200">Notas opcionales</span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Ejemplo: transferí desde cuenta terminada en 1234"
                className="mt-2 min-h-28 w-full rounded-2xl border border-white/15 bg-slate-950/85 px-4 py-3 text-white outline-none transition placeholder:text-slate-400 hover:border-white/25 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-300/15"
              />
            </label>

            <button
              type="submit"
              disabled={!user || !areUsersReady}
              className="rounded-full bg-gradient-to-r from-emerald-300 to-lime-300 px-7 py-3.5 font-black text-slate-950 shadow-lg shadow-emerald-950/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Ya realicé el pago
            </button>
          </form>
        )}

        {error ? <p className="mt-4 text-sm font-bold text-red-300">{error}</p> : null}
        {message ? <p className="mt-4 text-sm font-bold text-emerald-200">{message}</p> : null}
      </section>
    </main>
  );
}
