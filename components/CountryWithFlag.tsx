import { getTeamFlagUrl } from "@/data/teamFlags";

type CountryWithFlagProps = {
  name: string;
  /** Ancho en píxeles de la bandera. Recomendado entre 18 y 24. */
  size?: number;
  /** Alinea el texto a la derecha (espejo: texto · bandera). */
  alignRight?: boolean;
  className?: string;
  /** Si es true, el texto se acorta con ellipsis cuando no entra. */
  truncate?: boolean;
};

/**
 * Texto del equipo + banderita pequeña al lado.
 * Diseñado para no deformar filas (altura fija, bandera pequeña, gap chico).
 * Si no hay bandera mapeada, muestra solo el nombre — nunca rompe el layout.
 */
export function CountryWithFlag({
  name,
  size = 22,
  alignRight = false,
  className,
  truncate = false,
}: CountryWithFlagProps) {
  const url = getTeamFlagUrl(name, 40);
  const flag = url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      aria-hidden="true"
      width={size}
      height={Math.round((size * 3) / 4)}
      loading="lazy"
      decoding="async"
      className="inline-block flex-none rounded-[3px] border border-white/15 object-cover shadow-sm shadow-black/30"
      style={{ width: size, height: Math.round((size * 3) / 4) }}
    />
  ) : null;

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
