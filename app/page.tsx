"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";

/**
 * Homepage broadcast FIFA. Composición editorial inspirada en covers de
 * torneo internacional: mega headline italic + bloque scoreboard al costado +
 * franjas de color torneo + halftones de impresión deportiva.
 */
export default function Home() {
  const { user, isReady } = useAuth();
  const isAdmin = user?.role === "admin";
  const isParticipant = user?.role === "participante";

  const heroOverline = isAdmin
    ? "Sala de control"
    : isParticipant
      ? "Tu cancha está abierta"
      : "Inscripción abierta";

  const heroLineA = isAdmin
    ? "MANTENÉ LA"
    : isParticipant
      ? "JUGÁ HASTA"
      : "JUGÁ EL";
  const heroLineB = isAdmin
    ? "TRANSMISIÓN"
    : isParticipant
      ? "LA FINAL"
      : "MUNDIAL";
  const heroLineC = isAdmin
    ? "EN VIVO"
    : isParticipant
      ? "Y SUMÁ"
      : "DEL 2026";

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-6 lg:px-8 lg:py-14">
      {/* HERO BROADCAST */}
      <section className="relative overflow-hidden rounded-[1.5rem] border border-white/[0.07] bg-[#03060d]">
        {/* Capa 1: gradient deep + halos torneo */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(140%_120%_at_15%_-10%,rgba(212,255,63,0.2)_0%,transparent_55%),radial-gradient(120%_120%_at_95%_8%,rgba(255,45,111,0.16)_0%,transparent_60%),radial-gradient(140%_100%_at_50%_120%,rgba(56,212,255,0.14)_0%,transparent_55%)]"
        />
        {/* Capa 2: halftone */}
        <div aria-hidden className="pointer-events-none absolute inset-0 fc-halftone opacity-50" />
        {/* Capa 3: diagonales */}
        <div aria-hidden className="pointer-events-none absolute inset-0 fc-diagonal opacity-50" />

        {/* FIFA flag-stripe top edge */}
        <div aria-hidden className="absolute inset-x-0 top-0 h-1 fc-flag-stripe" />

        {/* Banda diagonal lateral derecha — bloque magenta tipo lower-third */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 top-12 hidden h-[120%] w-40 bg-[var(--fc-magenta)] opacity-[0.08] lg:block"
          style={{ clipPath: "polygon(40% 0, 100% 0, 100% 100%, 0 100%)" }}
        />

        <div className="relative grid gap-8 px-6 py-12 sm:px-10 sm:py-14 lg:grid-cols-[1.4fr_1fr] lg:gap-12 lg:py-16">
          {/* Columna izquierda: textura editorial */}
          <div className="relative">
            <div className="flex flex-wrap items-center gap-2">
              <span className="fc-chip fc-chip-lime">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--fc-lime)] fc-pulse-dot-lime" />
                {heroOverline}
              </span>
              <span className="fc-chip fc-chip-magenta">FIFA · World Cup 26</span>
            </div>

            <h1 className="mt-7 fc-headline-mega text-[3.2rem] sm:text-[5rem] lg:text-[6.5rem]">
              <span className="block text-white">{heroLineA}</span>
              <span className="block text-[var(--fc-lime)] drop-shadow-[0_8px_24px_rgba(212,255,63,0.35)]">
                {heroLineB}
              </span>
              <span className="block fc-text-outline">{heroLineC}</span>
            </h1>

            <p className="mt-7 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
              Predicciones, ranking en vivo y llave eliminatoria animada. Un prode
              rápido, justo y emocional para vivir cada partido del Mundial con tus amigos.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              {isReady && !user ? (
                <>
                  <HeroCTA href="/login" variant="primary">
                    Iniciar sesión
                  </HeroCTA>
                  <HeroCTA href="/registro">Registrarme</HeroCTA>
                </>
              ) : null}
              {isParticipant ? (
                <>
                  <HeroCTA href="/partidos" variant="primary">
                    Ir a partidos
                  </HeroCTA>
                  <HeroCTA href="/tabla">Ver ranking</HeroCTA>
                </>
              ) : null}
              {isAdmin ? (
                <>
                  <HeroCTA href="/admin" variant="primary">
                    Panel admin
                  </HeroCTA>
                  <HeroCTA href="/resultados">Resultados</HeroCTA>
                </>
              ) : null}
            </div>
          </div>

          {/* Columna derecha: scoreboard del torneo */}
          <div className="relative">
            <div
              className="fc-broadcast-cut relative overflow-hidden border border-[var(--fc-lime)]/25 bg-[#02050b]/85 p-6 sm:p-7"
              style={{
                boxShadow: "inset 0 0 0 1px rgba(212,255,63,0.08), 0 18px 60px -22px rgba(0,0,0,0.7)",
              }}
            >
              <div className="flex items-center justify-between">
                <span className="fc-display-italic text-[0.66rem] uppercase tracking-[0.22em] text-slate-400">
                  Live · 2026
                </span>
                <span className="flex items-center gap-1.5 text-[0.66rem] uppercase tracking-[0.2em] text-[var(--fc-lime)]">
                  <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--fc-lime)] fc-pulse-dot-lime" />
                  ON AIR
                </span>
              </div>

              <p className="mt-4 fc-display-italic text-[0.7rem] uppercase tracking-[0.22em] text-slate-300">
                FIFA World Cup
              </p>
              <p className="fc-headline-mega mt-1 text-5xl text-white sm:text-6xl">
                26
              </p>

              <div className="mt-5 grid grid-cols-3 gap-2">
                {[
                  ["48", "Selecciones"],
                  ["104", "Partidos"],
                  ["1", "Final"],
                ].map(([num, label]) => (
                  <div
                    key={label}
                    className="fc-broadcast-cut-sm relative bg-white/[0.04] px-3 py-3 text-center"
                  >
                    <p className="fc-stencil text-3xl text-[var(--fc-lime)] sm:text-4xl">
                      {num}
                    </p>
                    <p className="fc-display-italic mt-0.5 text-[0.6rem] uppercase tracking-[0.2em] text-slate-400">
                      {label}
                    </p>
                  </div>
                ))}
              </div>

              <div aria-hidden className="my-5 h-px w-full fc-flag-stripe-soft opacity-60" />

              <p className="fc-display-italic text-[0.66rem] uppercase tracking-[0.22em] text-slate-400">
                USA · Canada · México
              </p>
              <p className="mt-1 text-sm text-slate-200">
                3 países anfitriones · 16 ciudades · 1 trofeo.
              </p>
            </div>

            {/* Acento flag stripe vertical lateral */}
            <div
              aria-hidden
              className="pointer-events-none absolute -left-3 top-6 hidden h-32 w-2 fc-flag-stripe-vertical opacity-80 lg:block"
            />
          </div>
        </div>
      </section>

      {/* SCOREBOARD KPIs */}
      <section className="mt-10 grid gap-3 md:grid-cols-3">
        <ScoreboardCard
          label="Inscripción"
          value="$10.000"
          description="Transferí al alias y declarás el pago. Aprueba el admin."
          tone="lime"
        />
        <ScoreboardCard
          label="Premio mayor"
          value="$100.000"
          description="El participante con más puntos al final se lleva todo."
          tone="yellow"
        />
        <ScoreboardCard
          label="Sistema de puntos"
          value="3 / 1 / 0"
          description="3 exacto · 1 ganador o empate · 0 errado."
          tone="cyan"
        />
      </section>

      {/* CÓMO FUNCIONA */}
      <section className="mt-16">
        <SectionHeader
          overline="Cómo se juega"
          title="Tres tiempos para entrar a la cancha"
        />
        <div className="grid gap-3 md:grid-cols-3">
          {[
            ["01", "Registrate", "Creá tu usuario participante en segundos."],
            [
              "02",
              "Pagá la inscripción",
              "Transferí al alias y declarás quién hizo la transferencia.",
            ],
            [
              "03",
              "Cargá tus predicciones",
              "Sumá puntos cuando se carguen los resultados reales.",
            ],
          ].map(([step, title, description]) => (
            <article
              key={step}
              className="fc-card fc-card-accent group relative flex h-full flex-col overflow-hidden p-6 transition hover:-translate-y-1 hover:border-[var(--fc-lime)]/30"
            >
              <div aria-hidden className="pointer-events-none absolute inset-0 fc-diagonal opacity-40" />
              <div className="relative flex items-center gap-3">
                <span
                  className="fc-broadcast-cut-sm fc-display-italic grid h-12 w-14 place-items-center text-lg text-slate-950"
                  style={{
                    background:
                      "linear-gradient(135deg, #d4ff3f 0%, #b8f038 60%, #ffd84d 100%)",
                  }}
                >
                  {step}
                </span>
                <span className="fc-display-italic text-[0.7rem] uppercase tracking-[0.22em] text-slate-400">
                  Paso
                </span>
              </div>
              <h3 className="relative mt-5 fc-display-italic text-2xl uppercase tracking-[0.02em] text-white">
                {title}
              </h3>
              <p className="relative mt-3 text-sm leading-6 text-slate-300">{description}</p>
            </article>
          ))}
        </div>
      </section>

      {/* MICRO PILLARS */}
      <section className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Simple", "Entrás, elegís el partido y cargás el resultado."],
          ["Competitivo", "La tabla se ordena automáticamente por puntos."],
          ["Automático", "Los puntos se recalculan ante cada resultado nuevo."],
          ["Con amigos", "Pensado para grupos privados durante todo el torneo."],
        ].map(([title, description], idx) => {
          const tones = ["lime", "magenta", "cyan", "yellow"] as const;
          const dotColors = {
            lime: "bg-[var(--fc-lime)]",
            magenta: "bg-[var(--fc-magenta)]",
            cyan: "bg-[var(--fc-cyan)]",
            yellow: "bg-[var(--fc-yellow)]",
          };
          const tone = tones[idx % 4];
          return (
            <article
              key={title}
              className="fc-broadcast-cut-sm relative border border-white/[0.07] bg-white/[0.025] p-5 transition hover:-translate-y-0.5 hover:bg-white/[0.05]"
            >
              <div className="flex items-center gap-2">
                <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${dotColors[tone]}`} />
                <h3 className="fc-display-italic text-base uppercase tracking-[0.06em] text-white">
                  {title}
                </h3>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-300">{description}</p>
            </article>
          );
        })}
      </section>

      <footer className="mt-16 flex flex-col items-center gap-3 border-t border-white/[0.07] pt-8 text-center">
        <div aria-hidden className="h-1 w-32 fc-flag-stripe" />
        <p className="fc-display-italic text-xs uppercase tracking-[0.32em] text-slate-500">
          Prode Mundial 2026
        </p>
      </footer>
    </main>
  );
}

/* ---------------------------------------------------------------------- */

function SectionHeader({
  overline,
  title,
}: {
  overline: string;
  title: string;
}) {
  return (
    <header className="mb-6 flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <span aria-hidden className="h-3 w-3 rotate-45 bg-[var(--fc-lime)] shadow-[0_0_18px_rgba(212,255,63,0.6)]" />
        <p className="fc-display-italic text-[0.7rem] uppercase tracking-[0.32em] text-[var(--fc-lime)]">
          {overline}
        </p>
      </div>
      <h2 className="fc-display-italic text-3xl uppercase leading-[0.95] tracking-[0.01em] text-white sm:text-4xl">
        {title}
      </h2>
    </header>
  );
}

function ScoreboardCard({
  label,
  value,
  description,
  tone,
}: {
  label: string;
  value: string;
  description: string;
  tone: "lime" | "yellow" | "cyan";
}) {
  const palette = {
    lime: {
      border: "border-[var(--fc-lime)]/30",
      labelColor: "text-[var(--fc-lime)]",
      valueColor: "text-white",
      shine:
        "bg-[radial-gradient(120%_120%_at_0%_0%,rgba(212,255,63,0.18)_0%,transparent_60%)]",
    },
    yellow: {
      border: "border-[var(--fc-yellow)]/30",
      labelColor: "text-[var(--fc-yellow)]",
      valueColor: "text-white",
      shine:
        "bg-[radial-gradient(120%_120%_at_0%_0%,rgba(255,216,77,0.18)_0%,transparent_60%)]",
    },
    cyan: {
      border: "border-[var(--fc-cyan)]/30",
      labelColor: "text-[var(--fc-cyan)]",
      valueColor: "text-white",
      shine:
        "bg-[radial-gradient(120%_120%_at_0%_0%,rgba(56,212,255,0.18)_0%,transparent_60%)]",
    },
  }[tone];

  return (
    <article
      className={`relative overflow-hidden border ${palette.border} bg-[#03060d]/85 p-5 transition hover:-translate-y-1 fc-broadcast-cut-sm`}
    >
      <div aria-hidden className={`pointer-events-none absolute inset-0 ${palette.shine}`} />
      <div aria-hidden className="pointer-events-none absolute inset-0 fc-halftone opacity-30" />
      <div className="relative flex items-center justify-between">
        <p className={`fc-display-italic text-[0.66rem] uppercase tracking-[0.24em] ${palette.labelColor}`}>
          {label}
        </p>
        <span aria-hidden className={`h-2 w-2 rotate-45 ${palette.labelColor.replace("text-", "bg-")}`} />
      </div>
      <p className={`relative mt-3 fc-stencil text-5xl uppercase ${palette.valueColor} sm:text-6xl`}>
        {value}
      </p>
      <p className="relative mt-3 text-sm leading-6 text-slate-300">{description}</p>
    </article>
  );
}

function HeroCTA({
  href,
  children,
  variant = "secondary",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
}) {
  if (variant === "primary") {
    return (
      <Link href={href} className="fc-cta-fifa">
        <span aria-hidden>▸</span>
        {children}
      </Link>
    );
  }
  return (
    <Link href={href} className="fc-cta-ghost">
      {children}
    </Link>
  );
}
