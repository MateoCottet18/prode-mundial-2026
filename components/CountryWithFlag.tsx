import { getTeamFlagUrl } from "@/data/teamFlags";

type CountryWithFlagProps = {
  name: string;
  /**
   * Tamaño visual de la bandera. Recomendado:
   *   - inline list: 16-22px
   *   - stack en card: 44-64px
   *   - stack hero: 72-96px
   */
  size?: number;
  /** Sólo aplica a `variant="inline"`: alinea texto a la derecha. */
  alignRight?: boolean;
  className?: string;
  /** Sólo en `variant="inline"`: trunca el nombre con ellipsis si no entra. */
  truncate?: boolean;
  /**
   * - `inline` (default): bandera + texto en una sola línea (listas, tablas).
   * - `stack`: bandera grande arriba + nombre chico debajo (cards de partido,
   *   bracket). Pensado para que la bandera sea el elemento principal y el
   *   nombre acompañe — estilo FIFA / OneFootball.
   */
  variant?: "inline" | "stack";
  /** Sólo en `variant="stack"`: tamaño del nombre (clase tailwind). */
  nameClassName?: string;
};

/**
 * Equipo + bandera. Variante `inline` para listas (alto fijo, bandera chica),
 * `stack` para escenarios donde la bandera lidera la lectura (card de partido,
 * bracket): bandera grande arriba, nombre uppercase pequeño debajo.
 */
export function CountryWithFlag({
  name,
  size = 22,
  alignRight = false,
  className,
  truncate = false,
  variant = "inline",
  nameClassName,
}: CountryWithFlagProps) {
  const url = getTeamFlagUrl(name, Math.max(80, size * 4));
  const flagWidth = size;
  const flagHeight = Math.round((size * 3) / 4);

  const flag = url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      aria-hidden="true"
      width={flagWidth}
      height={flagHeight}
      loading="lazy"
      decoding="async"
      className="block flex-none rounded-[3px] border border-white/15 object-cover shadow-sm shadow-black/40"
      style={{ width: flagWidth, height: flagHeight }}
    />
  ) : (
    // Si no hay bandera mapeada, mostramos un placeholder gris del mismo
    // tamaño para que el layout NO salte cuando se carga otra fila o en mobile.
    <span
      aria-hidden
      className="block flex-none rounded-[3px] border border-white/10 bg-white/[0.04]"
      style={{ width: flagWidth, height: flagHeight }}
    />
  );

  if (variant === "stack") {
    return (
      <span
        className={["flex flex-col items-center gap-1.5 text-center", className ?? ""]
          .filter(Boolean)
          .join(" ")}
      >
        {flag}
        <span
          className={[
            "fc-display-italic block max-w-full truncate uppercase tracking-[0.04em] text-white/90",
            nameClassName ?? "text-[0.7rem]",
          ].join(" ")}
          style={{ maxWidth: Math.max(72, flagWidth + 24) }}
        >
          {name}
        </span>
      </span>
    );
  }

  return (
    <span
      className={[
        "inline-flex items-center gap-2 align-middle",
        alignRight ? "flex-row-reverse" : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {flag}
      <span className={truncate ? "truncate" : undefined}>{name}</span>
    </span>
  );
}
