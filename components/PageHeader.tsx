import type { ReactNode } from "react";

type Tone = "lime" | "magenta" | "cyan" | "yellow";

const toneStyles: Record<
  Tone,
  { dot: string; text: string; chipClass: string }
> = {
  lime: {
    dot: "bg-[var(--fc-lime)]",
    text: "text-[var(--fc-lime)]",
    chipClass: "fc-chip-lime",
  },
  magenta: {
    dot: "bg-[var(--fc-magenta)]",
    text: "text-[var(--fc-magenta)]",
    chipClass: "fc-chip-magenta",
  },
  cyan: {
    dot: "bg-[var(--fc-cyan)]",
    text: "text-[var(--fc-cyan)]",
    chipClass: "fc-chip-cyan",
  },
  yellow: {
    dot: "bg-[var(--fc-yellow)]",
    text: "text-[var(--fc-yellow)]",
    chipClass: "fc-chip-yellow",
  },
};

type PageHeaderProps = {
  /** Etiqueta tipo lower-third arriba (estilo "PRENSA · FIFA"). */
  overline: string;
  /** Titular principal. Se renderiza con tipografía italic mega. */
  title: string;
  /** Línea descriptiva opcional debajo del título. */
  description?: string;
  /** Tono del acento (lima por default). */
  tone?: Tone;
  /** Slot opcional para acciones / KPIs a la derecha del header. */
  actions?: ReactNode;
};

/**
 * Header de página estilo "broadcast TV": franja diagonal de color torneo
 * + overline con LED + titular italic + descripción + slot de acciones.
 *
 * Se usa en TODAS las páginas para asegurar consistencia visual y reemplaza
 * los headers tipo "card pad gigante" del diseño anterior.
 */
export function PageHeader({
  overline,
  title,
  description,
  tone = "lime",
  actions,
}: PageHeaderProps) {
  const style = toneStyles[tone];

  return (
    <header className="relative mb-8 overflow-hidden">
      {/* Banda lateral diagonal — bloque tonal estilo lower-third */}
      <div
        aria-hidden
        className={`pointer-events-none absolute -left-12 top-1/2 hidden h-[200%] w-32 -translate-y-1/2 opacity-[0.07] sm:block ${style.dot}`}
        style={{ clipPath: "polygon(50% 0, 100% 0, 50% 100%, 0 100%)" }}
      />
      {/* FIFA flag-stripe acento abajo */}
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-[2px] fc-flag-stripe opacity-70" />

      <div className="relative flex flex-col gap-6 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span aria-hidden className={`h-3 w-3 rotate-45 ${style.dot} shadow-[0_0_18px_currentColor] ${style.text}`} />
            <p className={`fc-display-italic text-[0.7rem] uppercase tracking-[0.32em] ${style.text}`}>
              {overline}
            </p>
          </div>
          <h1 className="mt-3 fc-display-italic text-[2rem] uppercase leading-[0.92] tracking-[0.005em] text-white sm:text-5xl lg:text-[3.6rem]">
            {title}
          </h1>
          {description ? (
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
