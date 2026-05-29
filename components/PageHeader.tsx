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
    <header className="relative mb-7">
      {/* Línea finita del color del tono — separador limpio, sin halo. */}
      <div aria-hidden className={`mb-4 h-[2px] w-12 ${style.dot}`} />

      <div className="flex flex-col gap-5 border-b border-white/[0.06] pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className={`fc-display-italic text-[0.7rem] uppercase tracking-[0.32em] ${style.text}`}>
            {overline}
          </p>
          <h1 className="mt-2 fc-display-italic text-[1.85rem] uppercase leading-[0.95] tracking-[0.005em] text-white sm:text-4xl lg:text-[3rem]">
            {title}
          </h1>
          {description ? (
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
