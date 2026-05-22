"use client";

import { FormEvent, useState } from "react";

type ApiSuccess = {
  ok: true;
  authUserId: string;
  profile: {
    id: string;
    name: string;
    email: string;
    username: string;
    role: string;
    payment_status: string;
    created_at: string;
  };
};

type ApiError = {
  ok?: false;
  error?: string;
  details?: string | null;
  hint?: string | null;
  code?: string | null;
  step?: string;
  authUserId?: string | null;
  rolledBack?: boolean;
  attemptedRow?: Record<string, unknown>;
  stack?: string;
  supabaseUrlExists?: boolean;
  serviceRoleExists?: boolean;
};

const IS_TEST_ENABLED =
  process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_ENABLE_TEST_DB === "1";

export default function TestDbPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiSuccess | null>(null);
  const [error, setError] = useState("");
  const [rawError, setRawError] = useState<ApiError | null>(null);

  if (!IS_TEST_ENABLED) {
    return (
      <main className="mx-auto w-full max-w-lg px-5 py-14 sm:px-6 lg:px-8">
        <p className="text-sm font-bold uppercase tracking-[0.28em] text-emerald-200">Test DB</p>
        <h1 className="mt-3 text-3xl font-black text-white">Página de prueba deshabilitada</h1>
        <p className="mt-4 text-sm text-slate-300">
          Esta página existe solo para debugging del flujo Supabase y está apagada en producción.
          Para registrarte usá <code className="font-mono text-emerald-200">/registro</code>.
        </p>
      </main>
    );
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setRawError(null);
    setResult(null);
    setLoading(true);

    try {
      const response = await fetch("/api/test-db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });

      const text = await response.text();
      let data: ApiSuccess | ApiError | null = null;

      if (text.trim()) {
        try {
          data = JSON.parse(text) as ApiSuccess | ApiError;
        } catch {
          setError(`HTTP ${response.status}\n\nRespuesta no es JSON:\n${text}`);
          setRawError({ error: text });
          return;
        }
      } else {
        setError(`HTTP ${response.status}\n\nRespuesta vacía del servidor.`);
        setRawError(null);
        return;
      }

      if (!response.ok || !("ok" in data) || !data.ok) {
        const errData = data as ApiError;
        const parts = [
          `HTTP ${response.status}`,
          errData.step ? `step: ${errData.step}` : "",
          errData.error ?? "(sin mensaje error)",
          errData.details ? `details: ${errData.details}` : "",
          errData.hint ? `hint: ${errData.hint}` : "",
          errData.code ? `code: ${errData.code}` : "",
          errData.authUserId ? `authUserId: ${errData.authUserId}` : "",
          errData.rolledBack !== undefined ? `rolledBack: ${errData.rolledBack}` : "",
          errData.supabaseUrlExists !== undefined
            ? `supabaseUrlExists: ${errData.supabaseUrlExists}`
            : "",
          errData.serviceRoleExists !== undefined
            ? `serviceRoleExists: ${errData.serviceRoleExists}`
            : "",
        ].filter(Boolean);
        setError(parts.join("\n"));
        setRawError(errData);
        return;
      }

      setResult(data);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error ? fetchError.message : "Error desconocido al llamar /api/test-db",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-lg px-5 py-14 sm:px-6 lg:px-8">
      <p className="text-sm font-bold uppercase tracking-[0.28em] text-emerald-200">Test DB</p>
      <h1 className="mt-3 text-3xl font-black text-white">Prueba simple: profiles</h1>
      <p className="mt-4 text-sm text-slate-300">
        El formulario llama a <code className="font-mono text-emerald-200">POST /api/test-db</code>.
        El endpoint crea primero el usuario en <code className="font-mono text-emerald-200">auth.users</code>{" "}
        (admin / service role) y después inserta el <code className="font-mono text-emerald-200">profile</code>{" "}
        usando ese <code className="font-mono text-emerald-200">id</code>. Si el perfil falla, hace rollback del usuario de Auth.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-8 space-y-5 rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.075] to-white/[0.035] p-6 shadow-xl shadow-black/20"
      >
        <label className="block">
          <span className="text-sm font-bold text-slate-200">Nombre</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-2 h-12 w-full rounded-2xl border border-white/15 bg-slate-950/85 px-4 text-white outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-300/15"
            placeholder="Tu nombre"
            required
          />
        </label>
        <label className="block">
          <span className="text-sm font-bold text-slate-200">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-2 h-12 w-full rounded-2xl border border-white/15 bg-slate-950/85 px-4 text-white outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-300/15"
            placeholder="correo@ejemplo.com"
            required
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-gradient-to-r from-emerald-300 to-lime-300 px-6 py-3 font-black text-slate-950 shadow-lg shadow-emerald-950/20 transition hover:-translate-y-0.5 disabled:opacity-50"
        >
          {loading ? "Insertando…" : "Insertar en profiles"}
        </button>
      </form>

      {result ? (
        <div className="mt-6 rounded-2xl border border-emerald-300/30 bg-emerald-300/10 p-4 text-sm text-emerald-100">
          <p className="font-bold">Auth user + profile creados</p>
          <p className="mt-2 text-xs text-emerald-50/80">
            authUserId: <span className="font-mono">{result.authUserId}</span>
          </p>
          <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-white/10 bg-slate-950/70 p-3 text-[12px] text-emerald-50">
            {JSON.stringify(result.profile, null, 2)}
          </pre>
        </div>
      ) : null}

      {error ? (
        <div className="mt-6 rounded-2xl border border-red-300/30 bg-red-300/10 p-4 text-sm text-red-100">
          <p className="font-bold">Falló el insert</p>
          <pre className="mt-3 whitespace-pre-wrap break-words text-[12px] text-red-50">{error}</pre>
          {rawError ? (
            <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-white/10 bg-slate-950/70 p-3 text-[11px] text-red-50">
              {JSON.stringify(rawError, null, 2)}
            </pre>
          ) : null}
        </div>
      ) : null}
    </main>
  );
}
