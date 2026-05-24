"use client";

import { useMemo, useState } from "react";
import { AdminResultCard } from "@/components/AdminResultCard";
import { AdminAccordion } from "@/components/admin/AdminAccordion";
import type { Match, Matchday } from "@/data/matches";
import { parseScore, type ResultsByMatch, type ScoreInput } from "@/lib/prode";

type GroupKey = { type: "fecha"; value: Matchday; label: string };

/**
 * Sólo fechas de fase de grupos. La fase eliminatoria se administra desde el
 * accordion "Fase eliminatoria" (bracket en modo admin).
 */
const GROUPS: GroupKey[] = [
  { type: "fecha", value: 1, label: "Fecha 1" },
  { type: "fecha", value: 2, label: "Fecha 2" },
  { type: "fecha", value: 3, label: "Fecha 3" },
];

type Props = {
  groupMatches: Match[];
  results: ResultsByMatch;
  resultDrafts: Record<string, ScoreInput>;
  editingResults: Record<string, boolean>;
  onResultChange: (matchId: string, side: keyof ScoreInput, value: string) => void;
  onSaveResult: (matchId: string) => void;
  onEditResult: (matchId: string) => void;
  onDeleteResult: (matchId: string) => void;
};

/**
 * Sección de "Resultados manuales" agrupada por fecha de grupos.
 *
 * Cada fecha es un sub-accordion independiente. Cuando está cerrado, NO se
 * renderizan sus cards. Los drafts viven en el padre (`app/admin/page.tsx`),
 * así que abrir y cerrar no pierde lo que el admin estaba escribiendo.
 */
export function AdminResultsSection({
  groupMatches,
  results,
  resultDrafts,
  editingResults,
  onResultChange,
  onSaveResult,
  onEditResult,
  onDeleteResult,
}: Props) {
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  const matchesByGroup = useMemo(() => {
    const byKey: Record<string, Match[]> = {};
    for (const group of GROUPS) {
      const key = groupKeyId(group);
      byKey[key] = groupMatches.filter((match) => match.matchday === group.value);
    }
    return byKey;
  }, [groupMatches]);

  return (
    <div className="space-y-3">
      {GROUPS.map((group) => {
        const key = groupKeyId(group);
        const list = matchesByGroup[key] ?? [];
        const loaded = list.filter((match) => parseScore(results[match.id])).length;
        const pending = list.length - loaded;
        const isOpen = openGroup === key;

        return (
          <AdminAccordion
            key={key}
            id={`results-${key}`}
            title={group.label}
            badge={pending > 0 ? `${pending} pendientes` : "completo"}
            badgeTone={pending > 0 ? "amber" : "emerald"}
            meta={`${list.length} partidos`}
            isOpen={isOpen}
            onToggle={() => setOpenGroup((current) => (current === key ? null : key))}
            unmountWhenClosed
          >
            {list.length ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {list.map((match) => {
                  const hasSavedResult = Boolean(parseScore(results[match.id]));
                  const isEditing = editingResults[match.id] ?? !hasSavedResult;
                  const draftOrSaved = isEditing
                    ? resultDrafts[match.id] ?? results[match.id]
                    : results[match.id];

                  return (
                    <AdminResultCard
                      key={match.id}
                      match={match}
                      result={draftOrSaved}
                      canEditResult={isEditing}
                      hasSavedResult={hasSavedResult}
                      onResultChange={(side, value) => onResultChange(match.id, side, value)}
                      onSaveResult={() => onSaveResult(match.id)}
                      onEditResult={() => onEditResult(match.id)}
                      onDeleteResult={() => onDeleteResult(match.id)}
                    />
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No hay partidos para esta fecha todavía.</p>
            )}
          </AdminAccordion>
        );
      })}
    </div>
  );
}

function groupKeyId(group: GroupKey) {
  return `fecha-${group.value}`;
}
