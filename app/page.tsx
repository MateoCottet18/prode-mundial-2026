"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";

export default function Home() {
  const { user, isReady } = useAuth();
  const isAdmin = user?.role === "admin";
  const isParticipant = user?.role === "participante";
  const heroTitle = isAdmin
    ? "Panel de control del Prode Mundial 2026"
    : isParticipant
      ? "Bienvenido al Prode Mundial 2026"
      : "Jugá el Prode Mundial 2026 y ganá el premio mayor";

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-6 lg:px-8 lg:py-16">
      <section className="mx-auto max-w-4xl py-12 text-center sm:py-16">
        <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-4 py-2 text-sm font-medium text-emerald-100 shadow-lg shadow-emerald-950/20">
          <span className="h-2 w-2 rounded-full bg-emerald-300" />
          Inscripción abierta · Prode privado
        </div>
        <h1 className="text-balance text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
          {heroTitle}
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
          Un prode simple, competitivo y automático para jugar con amigos durante todo el
          Mundial. Registrate, confirmá tu inscripción y cargá tus predicciones.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          {isReady && !user ? (
            <>
              <HeroButton href="/login" variant="primary">
                Iniciar sesión
              </HeroButton>
              <HeroButton href="/registro">Registrarme</HeroButton>
            </>
          ) : null}
          {isParticipant ? (
            <>
              <HeroButton href="/partidos" variant="primary">
                Ir a partidos
              </HeroButton>
              <HeroButton href="/tabla">Ver tabla</HeroButton>
            </>
          ) : null}
          {isAdmin ? (
            <>
              <HeroButton href="/admin" variant="primary">
                Ir al panel admin
              </HeroButton>
              <HeroButton href="/resultados">Ver resultados</HeroButton>
            </>
          ) : null}
        </div>
      </section>

      <section className="grid gap-5 py-12 md:grid-cols-3">
        {[
          ["Inscripción", "$10.000", "Transferí al alias y subí tu comprobante para revisión."],
          ["Premio mayor", "$100.000", "El participante con más puntos al final gana el premio."],
          ["Sistema de puntos", "3 / 1 / 0", "3 exacto, 1 ganador o empate, 0 errado."],
        ].map(([title, value, description]) => (
          <article
            key={title}
            className="h-full rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.075] to-white/[0.035] p-6 shadow-xl shadow-black/10 backdrop-blur transition hover:-translate-y-1 hover:border-emerald-300/30"
          >
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-emerald-200">
              {title}
            </p>
            <p className="mt-4 text-3xl font-black text-white">{value}</p>
            <p className="mt-3 text-sm leading-6 text-slate-300">{description}</p>
          </article>
        ))}
      </section>

      <section className="py-14">
        <div className="mb-6">
          <p className="text-sm font-bold uppercase tracking-[0.28em] text-emerald-200">
            Cómo funciona
          </p>
          <h2 className="mt-3 text-3xl font-black text-white">Tres pasos para participar</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {[
            ["1", "Registrate", "Creá tu usuario participante desde la página de registro."],
            ["2", "Pagá tu inscripción", "Transferí $10.000 al alias mateo.cottet y subí el comprobante."],
            ["3", "Cargá tus predicciones y competí", "Sumá puntos cuando se carguen resultados reales."],
          ].map(([step, title, description]) => (
            <article key={step} className="h-full rounded-3xl border border-white/10 bg-white/[0.05] p-6 transition hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.075]">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-300 text-lg font-black text-slate-950">
                {step}
              </span>
              <h3 className="mt-5 text-xl font-black text-white">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-300">{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-5 py-14 md:grid-cols-4">
        {[
          ["Simple", "Entrás, elegís el partido y guardás el resultado que imaginás."],
          ["Competitivo", "La tabla de participantes se ordena automáticamente por puntos."],
          ["Automático", "Los puntos se recalculan cuando el admin carga resultados reales."],
          ["Con amigos", "Pensado para grupos privados y competencia durante todo el Mundial."],
        ].map(([title, description]) => (
          <article key={title} className="h-full rounded-3xl border border-white/10 bg-slate-950/45 p-5 transition hover:-translate-y-1 hover:border-emerald-300/25">
            <h3 className="text-lg font-black text-white">{title}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-300">{description}</p>
          </article>
        ))}
      </section>

      <footer className="border-t border-white/10 py-8 text-center text-sm text-slate-300">
        Prode Mundial 2026
      </footer>
    </main>
  );
}

function HeroButton({
  href,
  children,
  variant = "secondary",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
}) {
  return (
    <Link
      href={href}
      className={
        variant === "primary"
          ? "inline-flex items-center justify-center rounded-full bg-gradient-to-r from-emerald-300 via-lime-300 to-yellow-300 px-7 py-3.5 text-base font-black text-slate-950 shadow-xl shadow-lime-500/20 transition hover:-translate-y-0.5 hover:shadow-lime-500/30"
          : "inline-flex items-center justify-center rounded-full border border-emerald-300/25 bg-emerald-300/10 px-7 py-3.5 text-base font-semibold text-emerald-100 backdrop-blur transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-300/20"
      }
    >
      {children}
    </Link>
  );
}
