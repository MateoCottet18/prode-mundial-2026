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

      // Notificamos al resto de la app para que se recarguen la sesión y los
      // profiles desde Supabase. La sesión queda activa porque supabase-js
      // mantiene el JWT internamente.
      window.dispatchEvent(new Event("prode-session-change"));
      window.dispatchEvent(new Event("prode-users-change"));
      setMessage("Usuario registrado. Te llevamos a cargar el comprobante de pago.");
      setTimeout(() => router.push("/pago"), 600);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto grid w-full max-w-6xl items-center gap-8 px-5 py-12 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-16">
      <section>
        <p className="text-sm font-bold uppercase tracking-[0.28em] text-emerald-200">Registro</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
          Creá tu usuario participante
        </h1>
        <p className="mt-4 max-w-xl text-slate-300">
          Tu cuenta usa email + contraseña. El email es obligatorio para que el admin pueda
          contactar al ganador.
        </p>
        <div className="mt-6 rounded-3xl border border-emerald-300/20 bg-emerald-300/10 p-5 shadow-lg shadow-emerald-950/10">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-emerald-200">
            Inscripción
          </p>
          <p className="mt-2 text-3xl font-black text-white">$10.000 pesos</p>
          <p className="mt-2 text-sm text-slate-300">
            Transferí al alias mateo.cottet y subí el comprobante. Cuando el admin lo aprueba,
            tu usuario queda habilitado para jugar.
          </p>
        </div>
        <Link
          href="/login"
          className="mt-6 inline-flex rounded-full border border-white/15 bg-white/[0.06] px-6 py-3 font-bold text-white transition hover:-translate-y-0.5 hover:bg-white/10"
        >
          Ya tengo usuario
        </Link>
      </section>

      <form
        onSubmit={handleSubmit}
        className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.075] to-white/[0.035] p-6 shadow-2xl shadow-black/20 backdrop-blur"
      >
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
          <p className="mt-5 rounded-2xl border border-red-300/30 bg-red-300/10 px-4 py-3 text-sm font-bold text-red-100">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="mt-5 rounded-2xl border border-emerald-300/30 bg-emerald-300/10 px-4 py-3 text-sm font-bold text-emerald-100">
            {message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 w-full rounded-full bg-gradient-to-r from-emerald-300 to-lime-300 px-6 py-3 font-black text-slate-950 shadow-lg shadow-emerald-950/20 transition hover:-translate-y-0.5 disabled:opacity-60"
        >
          {submitting ? "Registrando…" : "Registrarme"}
        </button>
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
    <label className="mt-5 block first:mt-0">
      <span className="text-sm font-bold text-slate-200">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-12 w-full rounded-2xl border border-white/15 bg-slate-950/85 px-4 text-white outline-none transition placeholder:text-slate-400 hover:border-white/25 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-300/15"
        placeholder={placeholder}
      />
    </label>
  );
}
