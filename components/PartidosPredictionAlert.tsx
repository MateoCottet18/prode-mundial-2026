import type { PartidosTabSummary } from "@/lib/partidosUx";

type PartidosPredictionAlertProps = {
  summary: PartidosTabSummary;
};

/**
 * Resumen compacto de predicciones pendientes en la pestaña activa de /partidos.
 * Solo para participantes.
 */
export function PartidosPredictionAlert({ summary }: PartidosPredictionAlertProps) {
  const {
    tabLabel,
    openCount,
    missingPredictionCount,
    closingTodayCount,
    nextClose,
  } = summary;

  if (openCount === 0) {
    return (
      <aside
        className="mb-6 border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-slate-300"
        aria-live="polite"
      >
        <p>No quedan partidos abiertos en {tabLabel}.</p>
      </aside>
    );
  }

  const lines: string[] = [];

  if (missingPredictionCount > 0) {
    lines.push(
      `Te faltan ${missingPredictionCount} predicción${missingPredictionCount === 1 ? "" : "es"} por cargar en ${tabLabel}.`,
    );
  } else {
    lines.push(`Tenés todas las predicciones cargadas para ${tabLabel}.`);
  }

  if (closingTodayCount > 0) {
    lines.push(
      `Hay ${closingTodayCount} partido${closingTodayCount === 1 ? "" : "s"} que cierra${closingTodayCount === 1 ? "" : "n"} hoy.`,
    );
  }

  if (nextClose) {
    lines.push(
      `Próximo cierre: ${nextClose.label} · ${nextClose.time} hora Argentina.`,
    );
  }

  const tone =
    missingPredictionCount > 0
      ? "border-[var(--fc-yellow)]/30 bg-[var(--fc-yellow)]/[0.06] text-[var(--fc-yellow)]"
      : "border-[var(--fc-lime)]/25 bg-[var(--fc-lime)]/[0.05] text-[var(--fc-lime)]";

  return (
    <aside
      className={`mb-6 border px-4 py-3 text-sm ${tone}`}
      aria-live="polite"
    >
      <ul className="space-y-1">
        {lines.map((line) => (
          <li key={line} className="flex items-start gap-2 text-slate-100">
            <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-current opacity-80" />
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
