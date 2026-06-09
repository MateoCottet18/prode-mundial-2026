"use client";

import { useCallback, useState } from "react";
import {
  fetchMatchPredictions,
  type MatchPredictionEntry,
  type MatchPredictionsSummary,
} from "@/lib/services/predictionService";

type Props = {
  matchId: string;
  /**
   * `true` cuando el partido ya comenzó (kickoff pasó o hay resultado
   * cargado). Antes del kickoff las predicciones ajenas quedan ocultas.
   */
  revealed: boolean;
  homeTeam: string;
  awayTeam: string;
  /** Variante reducida para el bracket (cards angostas de ~240px). */
  compact?: boolean;
};

/**
 * Bloque "Ver predicciones".
 *
 * - Antes del kickoff (`revealed === false`): muestra un aviso y no permite ver
 *   nada.
 * - Desde el kickoff: botón que, al abrirse, trae TODAS las predicciones del
 *   partido desde Supabase (no estado local) + un resumen agregado.
 *
 * Es sólo visualización: no edita, no afecta puntos/ranking/resultados.
 */
export function MatchPredictionsReveal({
  matchId,
  revealed,
  homeTeam,
  awayTeam,
  compact = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<MatchPredictionEntry[] | null>(null);
  const [summary, setSummary] = useState<MatchPredictionsSummary | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMatchPredictions(matchId);
      setEntries(data?.entries ?? []);
      setSummary(data?.summary ?? { total: 0, home: 0, draw: 0, away: 0 });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudieron cargar las predicciones.",
      );
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next && entries === null && !loading) {
      void load();
    }
  };

  if (!revealed) {
    return (
      <p
        className={`mt-3 flex items-center gap-1.5 border-l-2 border-slate-500/50 bg-white/[0.02] px-3 py-2 text-slate-400 ${
          compact ? "text-[0.6rem]" : "text-xs"
        }`}
      >
        <span aria-hidden>👁️</span>
        <span>Las predicciones se revelarán cuando comience el partido.</span>
      </p>
    );
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={open}
        className={`fc-display-italic inline-flex w-full items-center justify-center gap-2 border border-[var(--fc-cyan)]/30 bg-[var(--fc-cyan)]/[0.06] uppercase tracking-[0.16em] text-[var(--fc-cyan)] transition-colors hover:bg-[var(--fc-cyan)]/[0.12] ${
          compact ? "px-2 py-1 text-[0.6rem]" : "px-3 py-2 text-[0.7rem]"
        }`}
      >
        <span aria-hidden>{open ? "▾" : "▸"}</span>
        {open ? "Ocultar predicciones" : "Ver predicciones"}
      </button>

      {open ? (
        <div className="mt-2">
          {loading ? (
            <p className={`text-slate-400 ${compact ? "text-[0.6rem]" : "text-xs"}`}>
              Cargando predicciones…
            </p>
          ) : error ? (
            <p
              className={`text-[var(--fc-magenta)] ${compact ? "text-[0.6rem]" : "text-xs"}`}
              role="alert"
            >
              {error}
            </p>
          ) : entries && entries.length > 0 ? (
            <>
              <Summary summary={summary} homeTeam={homeTeam} awayTeam={awayTeam} compact={compact} />
              <ul
                className={`mt-2 space-y-1 overflow-y-auto ${compact ? "max-h-44" : "max-h-64"}`}
              >
                {entries.map((entry) => (
                  <li
                    key={entry.userId}
                    className={`flex items-center justify-between gap-2 border-b border-white/[0.05] pb-1 ${
                      compact ? "text-[0.62rem]" : "text-[0.78rem]"
                    }`}
                  >
                    <span className="min-w-0 truncate text-slate-200">{entry.name}</span>
                    <span className="fc-display shrink-0 tabular-nums text-white">
                      {entry.home}<span className="px-0.5 text-slate-500">-</span>{entry.away}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className={`text-slate-400 ${compact ? "text-[0.6rem]" : "text-xs"}`}>
              Todavía no hay predicciones para este partido.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function Summary({
  summary,
  homeTeam,
  awayTeam,
  compact,
}: {
  summary: MatchPredictionsSummary | null;
  homeTeam: string;
  awayTeam: string;
  compact: boolean;
}) {
  if (!summary) {
    return null;
  }
  const rowClass = compact ? "text-[0.6rem]" : "text-[0.72rem]";
  return (
    <div className="border border-white/[0.06] bg-white/[0.02] px-2.5 py-2">
      <div className={`flex items-center justify-between ${rowClass}`}>
        <span className="uppercase tracking-[0.14em] text-slate-400">
          Total de predicciones
        </span>
        <span className="fc-display tabular-nums text-white">{summary.total}</span>
      </div>
      <div className={`mt-1.5 grid grid-cols-3 gap-1.5 ${rowClass}`}>
        <SummaryStat label={`Gana ${homeTeam}`} value={summary.home} tone="lime" />
        <SummaryStat label="Empate" value={summary.draw} tone="slate" />
        <SummaryStat label={`Gana ${awayTeam}`} value={summary.away} tone="cyan" />
      </div>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "lime" | "cyan" | "slate";
}) {
  const toneClass =
    tone === "lime"
      ? "border-[var(--fc-lime)]/25 text-[var(--fc-lime)]"
      : tone === "cyan"
        ? "border-[var(--fc-cyan)]/25 text-[var(--fc-cyan)]"
        : "border-white/10 text-slate-300";
  return (
    <div className={`border ${toneClass} bg-black/20 px-1.5 py-1 text-center`}>
      <p className="fc-display text-base leading-none tabular-nums">{value}</p>
      <p className="mt-1 truncate text-[0.55rem] uppercase tracking-[0.1em] text-slate-400">
        {label}
      </p>
    </div>
  );
}
