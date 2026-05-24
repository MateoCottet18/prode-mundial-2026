"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUsers } from "@/hooks/useUsers";

export default function RegistroPage() {
  const router = useRouter();
  const { registerParticipant } = useUsers();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!displayName.trim() || !email.trim() || !username.trim() || password.length < 6) {
      setError("Completá nombre, email, usuario y una contraseña de al menos 6 caracteres.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await registerParticipant({
        displayName,
        name: displayName,
        email,
        username,
        password,
      });

      if (!result.ok) {
        setError(result.message);
        return;
      }

      if (result.requiresEmailConfirmation) {
        setMessage(
          "Registro creado. Si Supabase tiene confirmación de email activada, revisá tu bandeja antes de iniciar sesión. Si no llega el correo, pedile al admin que desactive «Confirm email» o que te confirme la cuenta.",
        );
        return;
      }

      window.dispatchEvent(new Event("prode-session-change"));
      window.dispatchEvent(new Event("prode-users-change"));
      setMessage("Usuario registrado. Te llevamos a cargar el comprobante de pago.");
      setTimeout(() => router.push("/pago"), 600);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto grid w-full max-w-6xl items-start gap-10 px-5 py-12 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8 lg:py-14">
      <section className="relative">
        <div className="flex items-center gap-3">
          <span aria-hidden className="h-3 w-3 rotate-45 bg-[var(--fc-magenta)] shadow-[0_0_18px_rgba(255,45,111,0.55)]" />
          <p className="fc-display-italic text-[0.7rem] uppercase tracking-[0.32em] text-[var(--fc-magenta)]">
            Inscripción
          </p>
        </div>
        <h1 className="mt-4 fc-headline-mega text-[3rem] sm:text-6xl lg:text-7xl">
          <span className="block text-white">SUMATE</span>
          <span className="block text-[var(--fc-lime)] drop-shadow-[0_8px_24px_rgba(212,255,63,0.35)]">
            AL TORNEO
          </span>
        </h1>
        <p className="mt-6 max-w-xl text-base leading-7 text-slate-300">
          Tu cuenta usa email + contraseña. El email es obligatorio para que el admin pueda
          contactar al ganador del premio mayor.
        </p>

        <article className="fc-broadcast-cut mt-7 relative flex flex-col gap-2 overflow-hidden border border-[var(--fc-lime)]/30 bg-[var(--fc-lime)]/[0.06] p-6 fc-glow-lime">
          <div aria-hidden className="pointer-events-none absolute inset-0 fc-halftone opacity-30" />
          <p className="relative fc-display-italic text-[0.66rem] uppercase tracking-[0.22em] text-[var(--fc-lime)]">
            Inscripción
          </p>
          <p className="relative fc-stencil text-5xl text-white">
            $10.000 <span className="fc-display-italic text-base text-slate-400">pesos</span>
          </p>
          <p className="relative text-sm leading-6 text-slate-300">
            Transferí al alias{" "}
            <strong className="text-[var(--fc-lime)]">mateo.cottet</strong> y declarás quién
            hizo la transferencia. Cuando el admin lo aprueba, tu usuario queda habilitado.
          </p>
        </article>

        <Link href="/login" className="fc-cta-ghost mt-7">
          Ya tengo usuario
        </Link>
      </section>

      <form
        onSubmit={handleSubmit}
        className="relative overflow-hidden rounded-[1.25rem] border border-white/[0.07] bg-[#03060d] p-7 sm:p-8"
      >
        <div aria-hidden className="absolute inset-x-0 top-0 h-[2px] fc-flag-stripe" />
        <div aria-hidden className="pointer-events-none absolute inset-0 fc-halftone opacity-30" />
        <div aria-hidden className="pointer-events-none absolute inset-0 fc-diagonal opacity-30" />

        <div className="relative">
          <span className="fc-chip fc-chip-magenta">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--fc-magenta)] fc-pulse-dot-lime" />
            Registro
          </span>
          <h2 className="mt-3 fc-display-italic text-3xl uppercase tracking-[0.02em] text-white">
            Creá tu usuario
          </h2>

          <Field label="Nombre" value={displayName} onChange={setDisplayName} placeholder="Mateo García" />
          <Field label="Email" value={email} onChange={setEmail} placeholder="tu@email.com" type="email" />
          <Field label="Usuario" value={username} onChange={setUsername} placeholder="mateo" />
          <Field
            label="Contraseña"
            value={password}
            onChange={setPassword}
            placeholder="Mínimo 6 caracteres"
            type="password"
          />

          {error ? (
            <p className="fc-broadcast-cut-sm mt-5 border border-[var(--fc-magenta)]/30 bg-[var(--fc-magenta)]/10 px-4 py-3 text-sm font-bold text-[var(--fc-magenta)]">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="fc-broadcast-cut-sm mt-5 border border-[var(--fc-lime)]/30 bg-[var(--fc-lime)]/10 px-4 py-3 text-sm font-bold text-[var(--fc-lime)]">
              {message}
            </p>
          ) : null}

          <button type="submit" disabled={submitting} className="fc-cta-fifa mt-7 w-full justify-center">
            <span aria-hidden>▸</span>
            {submitting ? "Registrando…" : "Registrarme"}
          </button>
        </div>
      </form>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <label className="mt-5 block first:mt-6">
      <span className="fc-display-italic text-[0.7rem] uppercase tracking-[0.22em] text-[var(--fc-lime)]">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="fc-broadcast-cut-sm mt-2 h-12 w-full border border-white/[0.07] bg-[#02050b]/85 px-4 text-white outline-none transition placeholder:text-slate-500 hover:border-white/15 focus:border-[var(--fc-lime)] focus:ring-4 focus:ring-[var(--fc-lime)]/15"
        placeholder={placeholder}
      />
    </label>
  );
}
