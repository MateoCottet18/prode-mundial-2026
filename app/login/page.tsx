"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const didLogin = login(username.trim(), password);

    if (!didLogin) {
      setError("Usuario o contraseña incorrectos.");
      return;
    }

    router.push("/partidos");
  };

  return (
    <main className="mx-auto grid w-full max-w-6xl items-center gap-8 px-5 py-12 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-16">
      <section>
        <p className="text-sm font-bold uppercase tracking-[0.28em] text-emerald-200">Login</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
          Entrá al Prode Mundial 2026
        </h1>
        <p className="mt-4 max-w-xl text-slate-400">
          Por ahora el login usa localStorage. Podés entrar con el admin fijo o con
          participantes registrados desde la página de registro.
        </p>
        <div className="mt-6 grid gap-3 text-sm text-slate-300">
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-slate-200 shadow-lg shadow-black/10">
            <strong className="text-emerald-200">Admin:</strong> usuario admin, contraseña
            admin123
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-slate-200 shadow-lg shadow-black/10">
            <strong className="text-emerald-200">Participante:</strong> usuario mateo,
            contraseña mateo123
          </div>
        </div>
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
      >
        <label className="block">
          <span className="text-sm font-bold text-slate-300">Usuario</span>
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="mt-2 h-12 w-full rounded-2xl border border-white/15 bg-slate-950/85 px-4 text-white outline-none transition placeholder:text-slate-400 hover:border-white/25 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-300/15"
            placeholder="mateo"
          />
        </label>
        <label className="mt-5 block">
          <span className="text-sm font-bold text-slate-300">Contraseña</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 h-12 w-full rounded-2xl border border-white/15 bg-slate-950/85 px-4 text-white outline-none transition placeholder:text-slate-400 hover:border-white/25 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-300/15"
            placeholder="mateo123"
          />
        </label>

        {error ? <p className="mt-4 text-sm font-bold text-red-300">{error}</p> : null}

        <button
          type="submit"
          className="mt-6 w-full rounded-full bg-gradient-to-r from-emerald-300 to-lime-300 px-6 py-3 font-black text-slate-950 shadow-lg shadow-emerald-950/20 transition hover:-translate-y-0.5"
        >
          Iniciar sesión
        </button>
      </form>
    </main>
  );
}
