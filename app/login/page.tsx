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
    <main className="mx-auto grid w-full max-w-6xl items-center gap-8 px-5 py-12 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-16">
      <section>
        <p className="text-sm font-bold uppercase tracking-[0.28em] text-emerald-200">Login</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
          Entrá al Prode Mundial 2026
        </h1>
        <p className="mt-4 max-w-xl text-slate-400">
          Podés ingresar con tu <strong className="text-white">email</strong> o con tu{" "}
          <strong className="text-white">usuario</strong> y la contraseña.
        </p>
        <Link
          href="/registro"
          className="mt-6 inline-flex rounded-full border border-white/15 bg-white/[0.06] px-6 py-3 font-bold text-white transition hover:-translate-y-0.5 hover:bg-white/10"
        >
          Crear nuevo usuario
        </Link>
      </section>

      <form
        onSubmit={handleSubmit}
        className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.075] to-white/[0.035] p-6 shadow-2xl shadow-black/20 backdrop-blur"
        autoComplete="on"
      >
        <label className="block">
          <span className="text-sm font-bold text-slate-300">Email o usuario</span>
          <input
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            className="mt-2 h-12 w-full rounded-2xl border border-white/15 bg-slate-950/85 px-4 text-white outline-none transition placeholder:text-slate-400 hover:border-white/25 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-300/15"
            placeholder="mateocottet o tu@email.com"
            autoComplete="username"
            autoCapitalize="off"
            spellCheck={false}
            disabled={submitting}
          />
        </label>

        <label className="mt-5 block">
          <span className="text-sm font-bold text-slate-300">Contraseña</span>
          <div className="relative mt-2">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-12 w-full rounded-2xl border border-white/15 bg-slate-950/85 px-4 pr-20 text-white outline-none transition placeholder:text-slate-400 hover:border-white/25 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-300/15"
              placeholder="Tu contraseña"
              autoComplete="current-password"
              disabled={submitting}
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              aria-pressed={showPassword}
              disabled={submitting}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl border border-white/15 bg-white/[0.06] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-slate-200 transition hover:bg-white/10 disabled:opacity-50"
            >
              {showPassword ? "Ocultar" : "Ver"}
            </button>
          </div>
        </label>

        {error ? (
          <p className="mt-5 rounded-2xl border border-red-300/30 bg-red-300/10 px-4 py-3 text-sm font-bold text-red-100">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 w-full rounded-full bg-gradient-to-r from-emerald-300 to-lime-300 px-6 py-3 font-black text-slate-950 shadow-lg shadow-emerald-950/20 transition hover:-translate-y-0.5 disabled:opacity-60"
        >
          {submitting ? "Iniciando sesión…" : "Iniciar sesión"}
        </button>
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
