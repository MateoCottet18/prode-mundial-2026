"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!identifier.trim() || !password) {
      setError("Completá tu email o usuario y la contraseña.");
      return;
    }

    setSubmitting(true);
    console.log("[login/page] submit iniciado");

    try {
      const result = await login(identifier, password);

      if (result.ok) {
        console.log("[login/page] redirigiendo →", result.redirectTo);
        router.replace(result.redirectTo);
        return;
      }

      const stepLabel = describeStep(result.failedStep);
      const reasonText = result.message || messageForReason(result.reason);
      setError(stepLabel ? `${stepLabel} — ${reasonText}` : reasonText);
      console.log(
        "[login/page] login rechazado:",
        result.reason,
        "paso:",
        result.failedStep,
      );
    } catch (unexpected) {
      console.error("[login/page] error no capturado", unexpected);
      setError("No pudimos iniciar sesión. Revisá tu conexión o intentá de nuevo.");
    } finally {
      setSubmitting(false);
      console.log("[login/page] submit finalizado (submitting=false)");
    }
  };

  return (
    <main className="mx-auto grid w-full max-w-6xl items-center gap-10 px-5 py-12 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8 lg:py-14">
      <section className="relative">
        <div className="flex items-center gap-2.5">
          <span aria-hidden className="h-2 w-2 rotate-45 bg-[var(--fc-lime)]" />
          <p className="fc-display-italic text-[0.7rem] uppercase tracking-[0.32em] text-[var(--fc-lime)]">
            Acceso participantes
          </p>
        </div>
        <h1 className="mt-4 fc-headline-mega text-[2.6rem] sm:text-5xl lg:text-6xl">
          <span className="block text-white">VOLVÉ AL</span>
          <span className="block text-[var(--fc-lime)]">CAMPO</span>
        </h1>
        <p className="mt-6 max-w-xl text-base leading-7 text-slate-400">
          Ingresá con tu <strong className="text-white">email</strong> o tu{" "}
          <strong className="text-white">usuario</strong>. Tus predicciones, puntos y posición
          siguen exactamente donde los dejaste.
        </p>
        <Link href="/registro" className="fc-cta-ghost mt-7">
          + Crear nuevo usuario
        </Link>
      </section>

      <form
        onSubmit={handleSubmit}
        className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a1018] p-7 sm:p-8"
        autoComplete="on"
      >
        <div aria-hidden className="absolute inset-x-0 top-0 h-[2px] fc-flag-stripe opacity-90" />

        <div className="relative">
          <span className="fc-chip fc-chip-cyan">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--fc-cyan)] fc-pulse-dot-lime" />
            Login
          </span>
          <h2 className="mt-3 fc-display-italic text-3xl uppercase tracking-[0.02em] text-white">
            Iniciá sesión
          </h2>

          <label className="mt-6 block">
            <span className="fc-display-italic text-[0.7rem] uppercase tracking-[0.22em] text-[var(--fc-lime)]">
              Usuario o email
            </span>
            <input
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              className="fc-broadcast-cut-sm mt-2 h-12 w-full border border-white/[0.07] bg-[#02050b]/85 px-4 text-white outline-none transition placeholder:text-slate-500 hover:border-white/15 focus:border-[var(--fc-lime)] focus:ring-4 focus:ring-[var(--fc-lime)]/15"
              placeholder="Usuario o email"
              autoComplete="username"
              autoCapitalize="off"
              spellCheck={false}
              disabled={submitting}
            />
          </label>

          <label className="mt-5 block">
            <span className="fc-display-italic text-[0.7rem] uppercase tracking-[0.22em] text-[var(--fc-lime)]">
              Contraseña
            </span>
            <div className="relative mt-2">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="fc-broadcast-cut-sm h-12 w-full border border-white/[0.07] bg-[#02050b]/85 px-4 pr-20 text-white outline-none transition placeholder:text-slate-500 hover:border-white/15 focus:border-[var(--fc-lime)] focus:ring-4 focus:ring-[var(--fc-lime)]/15"
                placeholder="Contraseña"
                autoComplete="current-password"
                disabled={submitting}
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                aria-pressed={showPassword}
                disabled={submitting}
                className="fc-broadcast-cut-sm fc-display-italic absolute right-2 top-1/2 -translate-y-1/2 border border-white/[0.07] bg-white/[0.04] px-3 py-1.5 text-[0.65rem] uppercase tracking-[0.18em] text-slate-200 transition hover:bg-white/15 disabled:opacity-50"
              >
                {showPassword ? "Ocultar" : "Ver"}
              </button>
            </div>
          </label>

          {error ? (
            <p className="fc-broadcast-cut-sm mt-5 border border-[var(--fc-magenta)]/30 bg-[var(--fc-magenta)]/10 px-4 py-3 text-sm font-bold text-[var(--fc-magenta)]">
              {error}
            </p>
          ) : null}

          <button type="submit" disabled={submitting} className="fc-cta-fifa mt-7 w-full justify-center">
            <span aria-hidden>▸</span>
            {submitting ? "Iniciando sesión…" : "Iniciar sesión"}
          </button>
        </div>
      </form>
    </main>
  );
}

function messageForReason(reason: string): string {
  switch (reason) {
    case "user_not_found":
      return "Usuario no encontrado.";
    case "invalid_password":
      return "Contraseña incorrecta.";
    case "email_not_confirmed":
      return "Tenés que confirmar tu email antes de iniciar sesión.";
    case "profile_missing":
      return "Tu usuario existe pero falta su perfil en la base. Avisá al admin.";
    case "lookup_error":
      return "No pudimos consultar la base de usuarios. Revisá tu conexión o intentá de nuevo.";
    case "auth_error":
      return "Supabase Auth rechazó la autenticación.";
    case "timeout":
      return "No pudimos iniciar sesión. Revisá tu conexión o intentá de nuevo.";
    default:
      return "No pudimos iniciar sesión. Intentá de nuevo en unos segundos.";
  }
}

function describeStep(step: string | undefined): string | null {
  switch (step) {
    case "find-username":
      return "Falló buscando usuario";
    case "find-email":
      return "Falló buscando el email";
    case "sign-in":
      return "Falló autenticando contraseña";
    case "read-profile":
      return "Falló leyendo perfil";
    case "config":
      return "Falló la configuración";
    default:
      return null;
  }
}
