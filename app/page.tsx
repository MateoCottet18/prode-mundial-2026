"use client";

import Image from "next/image";
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
    <main className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-6 lg:px-8 lg:py-12">
      {/* HERO sobrio. Antes había 3 halos radiales + halftone + diagonales +
          bloque magenta lateral + drop-shadow lima. Lo bajamos a un panel
          plano con la flag-stripe FIFA arriba como único acento de torneo. */}
      <section className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a1018]">
        <div aria-hidden className="absolute inset-x-0 top-0 h-[3px] fc-flag-stripe opacity-90" />

        <div className="relative grid gap-8 px-6 py-10 sm:px-9 sm:py-12 lg:grid-cols-[1.4fr_1fr] lg:gap-12 lg:py-14">
          {/* Columna izquierda */}
          <div className="relative">
            <div className="flex flex-wrap items-center gap-2">
              <span className="fc-chip fc-chip-lime">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--fc-lime)] fc-pulse-dot-lime" />
                {heroOverline}
              </span>
              <span className="fc-chip fc-chip-neutral">FIFA · World Cup 26</span>
            </div>

            <h1 className="mt-6 fc-headline-mega text-[2.8rem] sm:text-[4.2rem] lg:text-[5.4rem]">
              <span className="block text-white">{heroLineA}</span>
              <span className="block text-[var(--fc-lime)]">{heroLineB}</span>
              <span className="block fc-text-outline">{heroLineC}</span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-7 text-slate-400 sm:text-[1.05rem]">
              Predicciones, ranking en vivo y llave eliminatoria. Un prode
              rápido y justo para vivir cada partido del Mundial con tus amigos.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
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

          {/* Columna derecha: scoreboard con el LOGO OFICIAL del Mundial.
              Reemplazamos el "26" sintético por el branding real para que el
              hero deje de sentirse genérico y se ancle en el torneo. */}
          <div className="relative">
            <div className="fc-broadcast-cut relative overflow-hidden border border-white/[0.08] bg-black p-6 sm:p-7">
              <div className="flex items-center justify-between">
                <span className="fc-display-italic text-[0.66rem] uppercase tracking-[0.22em] text-slate-500">
                  Live · 2026
                </span>
                <span className="flex items-center gap-1.5 text-[0.66rem] uppercase tracking-[0.2em] text-[var(--fc-lime)]">
                  <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--fc-lime)] fc-pulse-dot-lime" />
                  ON AIR
                </span>
              </div>

              {/*
                "Stadium spotlight" detrás del logo. El logo oficial tiene
                negro sólido en el "26" que sobre fondo negro puro se perdía.
                Solución en 2 capas, sin tocar el logo:
                  1. Un disco difuminado (ámbar 38% + blur-3xl) que crea un
                     halo CIRCULAR visible — el "26" negro silueta contra esa
                     zona iluminada.
                  2. Un overlay radial encima (oro cálido → lima FIFA →
                     transparente) que da forma al "spotlight" tipo broadcast.
                Resultado: el logo destaca claramente, en paleta del torneo
                (oro + lima), sin colores fuera de tono ni efectos exagerados.
                Inspiración: graphics FIFA, posters Nike Football, EA Sports.
              */}
              <div className="relative mt-4 flex items-center justify-center py-5">
                <div
                  aria-hidden
                  className="pointer-events-none absolute h-[88%] w-[82%] rounded-full bg-amber-400/35 blur-3xl"
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,222,140,0.42)_0%,rgba(212,255,63,0.16)_42%,rgba(2,6,12,0)_75%)]"
                />
                <Image
                  src="/world-cup-2026-logo.png"
                  alt="FIFA World Cup 2026"
                  width={420}
                  height={420}
                  priority
                  className="relative h-auto w-[58%] max-w-[260px]"
                />
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2">
                {[
                  ["48", "Selecciones"],
                  ["104", "Partidos"],
                  ["1", "Final"],
                ].map(([num, label]) => (
                  <div
                    key={label}
                    className="fc-broadcast-cut-sm relative border border-white/[0.06] bg-white/[0.02] px-3 py-3 text-center"
                  >
                    <p className="fc-stencil text-3xl text-[var(--fc-lime)] sm:text-4xl">
                      {num}
                    </p>
                    <p className="fc-display-italic mt-0.5 text-[0.6rem] uppercase tracking-[0.2em] text-slate-500">
                      {label}
                    </p>
                  </div>
                ))}
              </div>

              <div aria-hidden className="my-5 h-px w-full bg-white/[0.06]" />

              <p className="fc-display-italic text-[0.66rem] uppercase tracking-[0.22em] text-slate-500">
                USA · Canada · México
              </p>
              <p className="mt-1 text-sm text-slate-300">
                3 países anfitriones · 16 ciudades · 1 trofeo.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* INSCRIPCIÓN + SISTEMA DE PUNTOS (compacto, dos columnas) */}
      <section className="mt-10 grid gap-3 md:grid-cols-2">
        <ScoreboardCard
          label="Inscripción"
          value="$10.000"
          description="Alias: mundial.prode.mp · Titular: Mateo Cottet. Pago revisado por el admin."
          tone="lime"
        />
        <ScoreboardCard
          label="Sistema de puntos"
          value="3 / 1 / 0"
          description="3 exacto · 1 ganador o empate · 0 errado."
          tone="cyan"
        />
      </section>

      {/* PODIO DE PREMIOS — jerarquía clásica (oro / plata / bronce). El
          1° ocupa todo el ancho con tipografía grande; 2° y 3° quedan
          compactos al lado en mobile/desktop. */}
      <section className="mt-12">
        <SectionHeader overline="Podio del torneo" title="Premios del Mundial 2026" />
        <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr]">
          <PrizeCard
            place="1°"
            tone="gold"
            label="Premio mayor"
            value="$250.000"
            description="Se lo lleva el participante con más puntos al final del torneo."
            featured
          />
          <PrizeCard
            place="2°"
            tone="silver"
            label="Segundo premio"
            value="2 camisetas"
            description="Dos camisetas de la Selección Argentina."
          />
          <PrizeCard
            place="3°"
            tone="bronze"
            label="Tercer premio"
            value="Kit personalizado"
            description="1 kit sublimado personalizado para el podio."
          />
        </div>
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
              className="fc-card fc-card-accent relative flex h-full flex-col p-6"
            >
              <div className="flex items-center gap-3">
                <span className="fc-broadcast-cut-sm fc-display-italic grid h-11 w-12 place-items-center bg-[var(--fc-lime)] text-base text-slate-950">
                  {step}
                </span>
                <span className="fc-display-italic text-[0.7rem] uppercase tracking-[0.22em] text-slate-500">
                  Paso
                </span>
              </div>
              <h3 className="mt-5 fc-display-italic text-xl uppercase tracking-[0.02em] text-white">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
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
              className="fc-broadcast-cut-sm relative border border-white/[0.07] bg-white/[0.02] p-5 transition-colors hover:bg-white/[0.04]"
            >
              <div className="flex items-center gap-2">
                <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${dotColors[tone]}`} />
                <h3 className="fc-display-italic text-base uppercase tracking-[0.06em] text-white">
                  {title}
                </h3>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
            </article>
          );
        })}
      </section>

      {/* Identidad oficial Mundial 2026: mascotas + trofeo + logo. Decorativo
          y discreto — tres bloques en grilla, no banners gigantes. */}
      <section className="mt-14">
        <SectionHeader
          overline="Mundial 2026"
          title="La identidad oficial del torneo"
        />
        <div className="grid gap-3 lg:grid-cols-[1.4fr_0.85fr_0.85fr]">
          <article className="fc-broadcast-cut relative overflow-hidden border border-white/[0.08] bg-black p-5">
            <div aria-hidden className="absolute inset-x-4 top-0 h-[2px] fc-flag-stripe opacity-80" />
            <div className="flex items-end justify-between gap-4">
              <div className="min-w-0">
                <p className="fc-display-italic text-[0.66rem] uppercase tracking-[0.32em] text-[var(--fc-lime)]">
                  Mascotas oficiales
                </p>
                <h3 className="mt-1 fc-display-italic text-xl uppercase tracking-[0.04em] text-white sm:text-2xl">
                  Maple · Zayu · Clutch
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  El alce de Canadá, el jaguar de México y el águila de Estados
                  Unidos. Las tres caras del torneo.
                </p>
              </div>
              <Image
                src="/world-cup-2026-mascots.png"
                alt="Mascotas oficiales FIFA World Cup 2026: Maple, Zayu y Clutch"
                width={520}
                height={290}
                className="h-auto w-[44%] max-w-[260px] shrink-0 object-contain"
              />
            </div>
          </article>

          <article className="fc-broadcast-cut relative flex flex-col items-center gap-3 overflow-hidden border border-[var(--fc-yellow)]/25 bg-black p-5 text-center">
            <p className="fc-display-italic text-[0.66rem] uppercase tracking-[0.32em] text-[var(--fc-yellow)]">
              Trofeo
            </p>
            <Image
              src="/world-cup-trophy.png"
              alt="Copa del Mundo FIFA"
              width={220}
              height={220}
              className="h-auto w-[58%] max-w-[160px]"
            />
            <p className="text-sm leading-6 text-slate-400">
              El destino final del torneo: la Copa del Mundo.
            </p>
          </article>

          <article className="fc-broadcast-cut relative flex flex-col items-center gap-3 overflow-hidden border border-white/[0.08] bg-black p-5 text-center">
            <p className="fc-display-italic text-[0.66rem] uppercase tracking-[0.32em] text-[var(--fc-lime)]">
              Branding oficial
            </p>
            {/* Halo dorado en 2 capas (disco blur + radial spotlight) —
                mismo tratamiento que el hero. El "26" negro silueta limpio
                contra el ámbar elevado sin colores fuera de paleta. */}
            <div className="relative flex w-full items-center justify-center py-3">
              <div
                aria-hidden
                className="pointer-events-none absolute h-[88%] w-[82%] rounded-full bg-amber-400/35 blur-2xl"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,222,140,0.4)_0%,rgba(212,255,63,0.14)_44%,rgba(2,6,12,0)_75%)]"
              />
              <Image
                src="/world-cup-2026-logo.png"
                alt="Logo FIFA World Cup 2026"
                width={260}
                height={260}
                className="relative h-auto w-[60%] max-w-[170px]"
              />
            </div>
            <p className="text-sm leading-6 text-slate-400">
              48 selecciones · 16 ciudades anfitrionas · 1 final.
            </p>
          </article>
        </div>
      </section>

      <footer className="mt-14 flex flex-col items-center gap-3 border-t border-white/[0.07] pt-7 text-center">
        <div aria-hidden className="h-[2px] w-24 fc-flag-stripe opacity-80" />
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
      <div className="flex items-center gap-2.5">
        <span aria-hidden className="h-2 w-2 rotate-45 bg-[var(--fc-lime)]" />
        <p className="fc-display-italic text-[0.7rem] uppercase tracking-[0.32em] text-[var(--fc-lime)]">
          {overline}
        </p>
      </div>
      <h2 className="fc-display-italic text-2xl uppercase leading-[0.95] tracking-[0.01em] text-white sm:text-3xl">
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
      border: "border-[var(--fc-lime)]/25",
      labelColor: "text-[var(--fc-lime)]",
      dot: "bg-[var(--fc-lime)]",
    },
    yellow: {
      border: "border-[var(--fc-yellow)]/25",
      labelColor: "text-[var(--fc-yellow)]",
      dot: "bg-[var(--fc-yellow)]",
    },
    cyan: {
      border: "border-[var(--fc-cyan)]/25",
      labelColor: "text-[var(--fc-cyan)]",
      dot: "bg-[var(--fc-cyan)]",
    },
  }[tone];

  return (
    <article
      className={`relative border ${palette.border} bg-[#0a1018] p-5 fc-broadcast-cut-sm transition-colors hover:bg-[#0d141d]`}
    >
      <div className="flex items-center justify-between">
        <p className={`fc-display-italic text-[0.66rem] uppercase tracking-[0.24em] ${palette.labelColor}`}>
          {label}
        </p>
        <span aria-hidden className={`h-1.5 w-1.5 rotate-45 ${palette.dot}`} />
      </div>
      <p className="mt-3 fc-stencil text-5xl uppercase text-white sm:text-6xl">
        {value}
      </p>
      <p className="mt-3 text-sm leading-6 text-slate-400">{description}</p>
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

/* ----------------------------------------------------------------------
 * PrizeCard — card de premio con jerarquía de podio (oro / plata / bronce).
 *
 * - El primero (`featured`) se ve más grande: tipografía mega-stencil, borde
 *   dorado más marcado y un acento superior con la stripe FIFA.
 * - Los otros dos quedan compactos, mismo layout pero sin destaque extra.
 * - La medalla circular a la izquierda usa el tono del podio.
 * --------------------------------------------------------------------- */
function PrizeCard({
  place,
  tone,
  label,
  value,
  description,
  featured = false,
}: {
  place: string;
  tone: "gold" | "silver" | "bronze";
  label: string;
  value: string;
  description: string;
  featured?: boolean;
}) {
  const palette = {
    gold: {
      border: "border-amber-300/45",
      medalBg: "bg-amber-300",
      medalText: "text-slate-950",
      label: "text-amber-200",
      value: "text-amber-100",
      stripe:
        "bg-[linear-gradient(90deg,_transparent_0%,_rgba(255,216,77,0.65)_50%,_transparent_100%)]",
    },
    silver: {
      border: "border-slate-300/35",
      medalBg: "bg-slate-200",
      medalText: "text-slate-950",
      label: "text-slate-200",
      value: "text-white",
      stripe: "bg-slate-300/35",
    },
    bronze: {
      border: "border-orange-300/40",
      medalBg: "bg-orange-400",
      medalText: "text-slate-950",
      label: "text-orange-200",
      value: "text-orange-100",
      stripe: "bg-orange-400/35",
    },
  }[tone];

  return (
    <article
      className={`fc-broadcast-cut-sm relative flex flex-col gap-3 border bg-[#0a1018] p-5 transition-colors ${palette.border} ${
        featured ? "lg:p-7" : ""
      }`}
    >
      <div aria-hidden className={`absolute inset-x-4 top-0 h-[2px] ${palette.stripe}`} />

      <div className="flex items-center gap-3">
        <span
          className={`fc-display-italic grid h-10 w-10 place-items-center rounded-full text-base ${palette.medalBg} ${palette.medalText}`}
          aria-hidden
        >
          {place}
        </span>
        <p className={`fc-display-italic text-[0.7rem] uppercase tracking-[0.24em] ${palette.label}`}>
          {label}
        </p>
      </div>

      <p
        className={`fc-stencil ${palette.value} ${
          featured ? "text-5xl sm:text-6xl" : "text-3xl sm:text-4xl"
        }`}
      >
        {value}
      </p>

      <p className="text-sm leading-6 text-slate-400">{description}</p>
    </article>
  );
}
