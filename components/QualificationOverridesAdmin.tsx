"use client";

import { useMemo, useState } from "react";
import type { Match } from "@/data/matches";
import { worldCup2026Teams } from "@/data/teams";
import type { ResultsByMatch } from "@/lib/prode";
import {
  baseQualifierSlots,
  getGroupStandings,
  getThirdPlacedTeams,
} from "@/lib/standings";
import type { QualificationOverride } from "@/lib/services/qualificationOverrideService";
import type { SaveOverrideInput } from "@/lib/services/qualificationOverrideService";

type SaveResult = { ok: true } | { ok: false; message: string };

type Props = {
  results: ResultsByMatch;
  matches: Match[];
  overrides: QualificationOverride[];
  isReady: boolean;
  error: string | null;
  adminUserId?: string;
  onSave: (input: SaveOverrideInput) => Promise<SaveResult>;
  onRemove: (slot: string) => Promise<SaveResult>;
};

const TEAMS = worldCup2026Teams
  .map((team) => team.name)
  .sort((a, b) => a.localeCompare(b));

/**
 * Sección del panel admin para gestionar overrides manuales de clasificación
 * a fase eliminatoria. Muestra los 32 slots base (1A..2L + BEST_THIRD_1..8) con:
 *   - quién está clasificado por cálculo automático
 *   - selector para fijar manualmente otro equipo
 *   - botón para guardar / borrar el override
 *
 * El cálculo en `lib/standings.ts` aplica el override antes que el cálculo
 * automático, así que cualquier cambio acá impacta de inmediato en partidos,
 * resultados, perfil y ranking.
 */
export function QualificationOverridesAdmin({
  results,
  matches,
  overrides,
  isReady,
  error,
  adminUserId,
  onSave,
  onRemove,
}: Props) {
  const standings = useMemo(() => getGroupStandings(results, matches), [results, matches]);
  const thirdPlacedTeams = useMemo(() => getThirdPlacedTeams(standings), [standings]);

  const autoBySlot = useMemo(() => {
    const map: Record<string, string> = {};
    for (const slot of baseQualifierSlots) {
      map[slot.id] = computeAutoTeam(slot.id, standings, thirdPlacedTeams);
    }
    return map;
  }, [standings, thirdPlacedTeams]);

  const overridesBySlot = useMemo(() => {
    const map: Record<string, QualificationOverride> = {};
    for (const override of overrides) {
      map[override.slot] = override;
    }
    return map;
  }, [overrides]);

  const [drafts, setDrafts] = useState<Record<string, { team: string; reason: string }>>({});
  const [savingSlot, setSavingSlot] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ slot: string; type: "ok" | "error"; message: string } | null>(
    null,
  );

  const updateDraft = (slot: string, side: "team" | "reason", value: string) => {
    setDrafts((current) => ({
      ...current,
      [slot]: {
        team: side === "team" ? value : current[slot]?.team ?? "",
        reason: side === "reason" ? value : current[slot]?.reason ?? "",
      },
    }));
  };

  const handleSave = async (slotId: string, defaultTeam: string) => {
    const draft = drafts[slotId];
    const teamToSave = (draft?.team ?? overridesBySlot[slotId]?.teamName ?? defaultTeam).trim();
    if (!teamToSave) {
      setFeedback({ slot: slotId, type: "error", message: "Elegí un equipo antes de guardar." });
      return;
    }

    setSavingSlot(slotId);
    setFeedback(null);
    const reasonValue = (draft?.reason ?? overridesBySlot[slotId]?.reason ?? "").trim();
    const result = await onSave({
      slot: slotId,
      teamName: teamToSave,
      reason: reasonValue.length > 0 ? reasonValue : null,
      updatedBy: adminUserId ?? null,
    });
    setSavingSlot(null);

    if (result.ok) {
      setFeedback({ slot: slotId, type: "ok", message: `Override guardado para ${slotId}.` });
      setDrafts((current) => {
        const next = { ...current };
        delete next[slotId];
        return next;
      });
    } else {
      setFeedback({ slot: slotId, type: "error", message: result.message });
    }
  };

  const handleRemove = async (slotId: string) => {
    setSavingSlot(slotId);
    setFeedback(null);
    const result = await onRemove(slotId);
    setSavingSlot(null);

    if (result.ok) {
      setFeedback({ slot: slotId, type: "ok", message: `Override eliminado para ${slotId}. Vuelve al cálculo automático.` });
    } else {
      setFeedback({ slot: slotId, type: "error", message: result.message });
    }
  };

  return (
    <div>
      <p className="text-sm text-slate-300">
        Si FIFA define un clasificado por fair play, sorteo u otro criterio que esta app no
        calcula, fijalo acá. El override pisa el cálculo automático para 16avos, octavos,
        cuartos, semifinal y final.
      </p>

      {!isReady ? (
        <p className="mt-4 text-sm text-slate-300">Cargando overrides…</p>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-2xl border border-red-300/30 bg-red-300/10 px-4 py-3 text-sm font-bold text-red-100">
          {error}
        </p>
      ) : null}

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {baseQualifierSlots.map((slot) => {
          const auto = autoBySlot[slot.id];
          const override = overridesBySlot[slot.id];
          const draft = drafts[slot.id];
          const currentTeam = override?.teamName ?? auto;
          const draftTeam = draft?.team ?? override?.teamName ?? "";
          const draftReason = draft?.reason ?? override?.reason ?? "";
          const isSaving = savingSlot === slot.id;
          const isManual = Boolean(override);
          const slotFeedback = feedback?.slot === slot.id ? feedback : null;

          return (
            <article
              key={slot.id}
              className={`fc-card p-4 transition hover:-translate-y-0.5 ${
                isManual
                  ? "border-amber-300/30 bg-amber-300/[0.05]"
                  : ""
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="fc-display text-[0.7rem] uppercase tracking-[0.22em] text-emerald-200 tabular-nums">
                    {slot.id}
                  </p>
                  <p className="mt-1 fc-display text-sm uppercase tracking-[0.04em] text-white">
                    {slot.label}
                  </p>
                </div>
                <span
                  className={`fc-display inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.65rem] uppercase tracking-[0.18em] ${
                    isManual
                      ? "border-amber-300/40 bg-amber-300/10 text-amber-100"
                      : "border-emerald-300/30 bg-emerald-300/10 text-emerald-100"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`h-1.5 w-1.5 rounded-full ${
                      isManual ? "bg-amber-300" : "bg-emerald-300"
                    }`}
                  />
                  {isManual ? "Manual" : "Auto"}
                </span>
              </div>

              <div className="mt-3 grid gap-2 text-sm text-slate-300">
                <p>
                  Cálculo automático:{" "}
                  <span className="fc-display tracking-[0.04em] text-white">{auto || "—"}</span>
                </p>
                <p>
                  Clasificado actual:{" "}
                  <span className="fc-display tracking-[0.04em] text-white">
                    {currentTeam || "—"}
                  </span>
                </p>
                {override?.reason ? (
                  <p className="text-xs text-amber-100/80">Motivo: {override.reason}</p>
                ) : null}
              </div>

              <div className="mt-4 grid gap-2">
                <label className="fc-display block text-[0.65rem] uppercase tracking-[0.16em] text-emerald-200">
                  Equipo manual
                </label>
                <select
                  value={draftTeam}
                  onChange={(event) => updateDraft(slot.id, "team", event.target.value)}
                  disabled={isSaving}
                  className="w-full rounded-xl border border-white/[0.07] bg-slate-950/85 px-4 py-2 text-sm text-white outline-none transition hover:border-white/15 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-300/15 disabled:opacity-60"
                >
                  <option value="">— Elegir equipo —</option>
                  {TEAMS.map((team) => (
                    <option key={team} value={team}>
                      {team}
                    </option>
                  ))}
                </select>

                <label className="fc-display mt-2 block text-[0.65rem] uppercase tracking-[0.16em] text-emerald-200">
                  Motivo (opcional)
                </label>
                <input
                  type="text"
                  value={draftReason}
                  onChange={(event) => updateDraft(slot.id, "reason", event.target.value)}
                  disabled={isSaving}
                  placeholder="Fair play, sorteo, etc."
                  className="w-full rounded-xl border border-white/[0.07] bg-slate-950/85 px-4 py-2 text-sm text-white outline-none transition placeholder:text-slate-500 hover:border-white/15 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-300/15 disabled:opacity-60"
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleSave(slot.id, auto)}
                  disabled={isSaving || !draftTeam}
                  className="fc-display rounded-lg bg-emerald-300 px-4 py-2 text-[0.7rem] uppercase tracking-[0.16em] text-slate-950 shadow-[0_10px_24px_-12px_rgba(74,222,128,0.55)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  {isSaving ? "Guardando…" : isManual ? "Actualizar override" : "Guardar override"}
                </button>
                {isManual ? (
                  <button
                    type="button"
                    onClick={() => handleRemove(slot.id)}
                    disabled={isSaving}
                    className="fc-display rounded-lg border border-red-300/30 bg-red-300/10 px-4 py-2 text-[0.7rem] uppercase tracking-[0.16em] text-red-100 transition hover:-translate-y-0.5 hover:bg-red-300/15 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                  >
                    Volver al cálculo automático
                  </button>
                ) : null}
              </div>

              {slotFeedback ? (
                <p
                  className={`mt-3 rounded-2xl border px-3 py-2 text-xs font-bold ${
                    slotFeedback.type === "ok"
                      ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-100"
                      : "border-red-300/30 bg-red-300/10 text-red-100"
                  }`}
                >
                  {slotFeedback.message}
                </p>
              ) : null}
            </article>
          );
        })}
      </div>

      <p className="mt-6 text-xs text-slate-400">
        Para fijar manualmente un equipo en un cruce puntual de octavos o más arriba (ej.{" "}
        <code className="rounded bg-slate-950/60 px-1 py-0.5 text-[0.7rem]">octavos-3-home</code>),
        insertá la fila directo en <code>public.qualification_overrides</code> con ese{" "}
        <code>slot</code>. La app lo aplica automáticamente.
      </p>
    </div>
  );
}

function computeAutoTeam(
  slotId: string,
  standings: ReturnType<typeof getGroupStandings>,
  thirdPlaced: ReturnType<typeof getThirdPlacedTeams>,
): string {
  const bestThirdMatch = slotId.match(/^BEST_THIRD_(\d+)$/);
  if (bestThirdMatch) {
    const index = Number(bestThirdMatch[1]) - 1;
    return thirdPlaced[index]?.team ?? `${index + 1}° mejor tercero`;
  }

  const groupSlotMatch = slotId.match(/^([12])([A-L])$/);
  if (groupSlotMatch) {
    const position = Number(groupSlotMatch[1]) as 1 | 2;
    const groupName = `Grupo ${groupSlotMatch[2]}` as keyof typeof standings;
    const groupStandings = standings[groupName];
    if (!groupStandings || groupStandings.some((team) => team.played < 3)) {
      return `${position}° ${groupName}`;
    }
    return groupStandings[position - 1]?.team ?? `${position}° ${groupName}`;
  }

  return "—";
}
