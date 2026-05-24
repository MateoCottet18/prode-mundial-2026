type Props = {
  /** Cantidad de pares (la mitad de los partidos del round previo). */
  pairs: number;
  side: "left" | "right";
};

/**
 * Columna de conectores entre dos rounds.
 *
 * Layout: una columna flex de altura completa con `pairs` celdas, cada una
 * dividida verticalmente en dos sub-celdas de igual altura. La sub-celda
 * superior dibuja la mitad de arriba de la "]" (línea horizontal en su centro
 * y línea vertical en el borde lateral), la inferior dibuja la mitad de abajo.
 *
 * Como cada round-column tiene la misma altura total y reparte sus matches con
 * `flex-1`, los centros de cada par caen exactamente en el medio de la celda
 * correspondiente del connector. Sin medir el DOM.
 */
export function BracketConnector({ pairs, side }: Props) {
  return (
    <div className="flex w-6 shrink-0 flex-col self-stretch">
      {Array.from({ length: pairs }).map((_, index) => (
        <PairConnector key={index} side={side} />
      ))}
    </div>
  );
}

function PairConnector({ side }: { side: "left" | "right" }) {
  const verticalEdge = side === "left" ? "border-r" : "border-l";
  const verticalEdgeColor = "border-white/15";

  return (
    <div className="relative flex flex-1 flex-col">
      <div className="flex flex-1 flex-col">
        <div className={`flex-1 ${verticalEdge} ${verticalEdgeColor}`} />
        <div className={`flex-1 ${verticalEdge} border-b ${verticalEdgeColor}`} />
      </div>
      <div className="flex flex-1 flex-col">
        <div className={`flex-1 ${verticalEdge} border-t ${verticalEdgeColor}`} />
        <div className={`flex-1 ${verticalEdge} ${verticalEdgeColor}`} />
      </div>
      <span
        aria-hidden
        className={`absolute top-1/2 h-px w-3 bg-white/15 ${
          side === "left" ? "right-[-0.75rem]" : "left-[-0.75rem]"
        }`}
      />
    </div>
  );
}
