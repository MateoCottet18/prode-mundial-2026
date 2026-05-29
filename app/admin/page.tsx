"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AdminAccordion } from "@/components/admin/AdminAccordion";
import { AdminPaymentsSection } from "@/components/admin/AdminPaymentsSection";
import { AdminResultsSection } from "@/components/admin/AdminResultsSection";
import { PageHeader } from "@/components/PageHeader";
import { KnockoutBracket } from "@/components/bracket/KnockoutBracket";
import { QualificationOverridesAdmin } from "@/components/QualificationOverridesAdmin";
import { buildBracket } from "@/lib/bracket/buildBracket";
import { useAuth } from "@/hooks/useAuth";
import { useMatches } from "@/hooks/useMatches";
import { useProdeStore } from "@/hooks/useProdeStore";
import { useQualificationOverrides } from "@/hooks/useQualificationOverrides";
import { useUsers } from "@/hooks/useUsers";
import {
  emptyScore,
  parseScore,
  type ScoreInput,
} from "@/lib/prode";
import { getAllGeneratedMatches } from "@/lib/standings";

type SectionId = "payments" | "overrides" | "bracket" | "results";

export default function AdminPage() {
  const { user, isReady: isAuthReady } = useAuth();
  const { matches } = useMatches();
  // El admin no necesita predicciones de nadie en este screen, sólo resultados.
  // Pasamos su userId para que el store filtre por user_id (admin no predice,
  // así que el fetch vuelve vacío en vez de bajar 52k filas).
  const {
    results,
    saveResult,
    deleteResult,
    recalculatePoints,
  } = useProdeStore(user?.userId ?? undefined);
  const { registeredUsers, updatePaymentStatus } = useUsers();
  const {
    overrides,
    overridesMap,
    saveOverride,
    removeOverride,
    isReady: areOverridesReady,
    error: overridesError,
  } = useQualificationOverrides();

  const allMatches = useMemo(
    () => getAllGeneratedMatches(results, matches, overridesMap),
    [results, matches, overridesMap],
  );
  const bracketLayout = useMemo(
    () => buildBracket(results, matches, overridesMap),
    [results, matches, overridesMap],
  );

  const [openSection, setOpenSection] = useState<SectionId | null>(null);
  const [resultDrafts, setResultDrafts] = useState<Record<string, ScoreInput>>({});
  const [editingResults, setEditingResults] = useState<Record<string, boolean>>({});

  if (isAuthReady && !user) {
    return <AccessCard title="Iniciá sesión como admin" href="/login" label="Ir al login" />;
  }

  if (isAuthReady && user?.role !== "admin") {
    return (
      <AccessCard
        title="No tenés permisos para cargar resultados reales"
        href="/partidos"
        label="Volver a partidos"
      />
    );
  }

  // ---------------------------------------------------------------------------
  // KPIs / contadores para mostrar en los headers de los accordions.
  // ---------------------------------------------------------------------------
  const loadedResults = allMatches.filter((match) => parseScore(results[match.id])).length;
  const pendingResults = allMatches.length - loadedResults;
  const loadedGroupResults = matches.filter((match) => parseScore(results[match.id])).length;
  const pendingGroupResults = matches.length - loadedGroupResults;
  const pendingPayments = registeredUsers.filter(
    (u) => u.paymentStatus === "pending_review",
  ).length;
  const overridesCount = overrides.length;

  const toggleSection = (section: SectionId) => {
    setOpenSection((current) => (current === section ? null : section));
  };

  const updateResultDraft = (matchId: string, side: keyof ScoreInput, value: string) => {
    setResultDrafts((currentDrafts) => ({
      ...currentDrafts,
      [matchId]: {
        ...(currentDrafts[matchId] ?? emptyScore),
        [side]: value,
      },
    }));
  };

  const handleSaveResult = async (matchId: string) => {
    const saved = await saveResult(
      matchId,
      resultDrafts[matchId] ?? results[matchId] ?? emptyScore,
    );

    if (saved) {
      setEditingResults((current) => ({ ...current, [matchId]: false }));
    }
  };

  const handleEditResult = (matchId: string) => {
    setResultDrafts((currentDrafts) => ({
      ...currentDrafts,
      [matchId]: results[matchId] ?? currentDrafts[matchId] ?? emptyScore,
    }));
    setEditingResults((current) => ({ ...current, [matchId]: true }));
  };

  const handleDeleteResult = async (matchId: string) => {
    await deleteResult(matchId);
    setResultDrafts((currentDrafts) => ({ ...currentDrafts, [matchId]: emptyScore }));
    setEditingResults((current) => ({ ...current, [matchId]: true }));
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-6 lg:px-8 lg:py-12">
      <PageHeader
        overline="Sala de control · LIVE"
        title="Panel admin"
        description="Cada bloque se abre y cierra con click. Sólo el bloque activo se renderiza completo."
        tone="magenta"
        actions={
          <button
            type="button"
            onClick={() => void recalculatePoints()}
            className="fc-cta-fifa"
          >
            <span aria-hidden>↻</span> Recalcular puntos
          </button>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Partidos" value={allMatches.length} tone="neutral" />
        <Kpi label="Resultados cargados" value={loadedResults} tone="lime" />
        <Kpi label="Pendientes" value={pendingResults} tone={pendingResults > 0 ? "yellow" : "lime"} />
        <Kpi label="Usuarios" value={registeredUsers.length} tone="cyan" />
      </div>

      <div className="space-y-3">
        <AdminAccordion
          id="payments"
          title="Revisión de pagos"
          description="Aprobá o rechazá las inscripciones que llegaron con comprobante."
          badge={pendingPayments > 0 ? `${pendingPayments} pendientes` : "al día"}
          badgeTone={pendingPayments > 0 ? "amber" : "emerald"}
          meta="Inscripción $10.000"
          isOpen={openSection === "payments"}
          onToggle={() => toggleSection("payments")}
          unmountWhenClosed
        >
          <AdminPaymentsSection
            registeredUsers={registeredUsers}
            onApprove={(idOrUsername) => void updatePaymentStatus(idOrUsername, "approved")}
            onReject={(idOrUsername) => void updatePaymentStatus(idOrUsername, "rejected")}
          />
        </AdminAccordion>

        <AdminAccordion
          id="overrides"
          title="Clasificados manuales"
          description="Override del cálculo automático para fase eliminatoria."
          badge={overridesCount > 0 ? `${overridesCount} activos` : "ninguno"}
          badgeTone={overridesCount > 0 ? "amber" : "neutral"}
          isOpen={openSection === "overrides"}
          onToggle={() => toggleSection("overrides")}
          unmountWhenClosed
        >
          <QualificationOverridesAdmin
            results={results}
            matches={matches}
            overrides={overrides}
            isReady={areOverridesReady}
            error={overridesError}
            adminUserId={user?.userId}
            onSave={saveOverride}
            onRemove={removeOverride}
          />
        </AdminAccordion>

        <AdminAccordion
          id="bracket"
          title="Fase eliminatoria"
          description="Cargá goles directo sobre la fase eliminatoria; los equipos avanzan automáticamente."
          badge="visual"
          badgeTone="emerald"
          isOpen={openSection === "bracket"}
          onToggle={() => toggleSection("bracket")}
          unmountWhenClosed
        >
          <KnockoutBracket
            bracket={bracketLayout}
            results={results}
            predictions={{}}
            savedPredictions={{}}
            mode="admin"
            canPredict={false}
            onSaveResult={(matchId, score) => saveResult(matchId, score)}
            onDeleteResult={(matchId) => deleteResult(matchId)}
          />
        </AdminAccordion>

        <AdminAccordion
          id="results"
          title="Resultados de grupos"
          description="Cargá, edita o borra resultados de Fecha 1, 2 y 3."
          badge={pendingGroupResults > 0 ? `${pendingGroupResults} pendientes` : "completo"}
          badgeTone={pendingGroupResults > 0 ? "amber" : "emerald"}
          meta={`${loadedGroupResults}/${matches.length} cargados`}
          isOpen={openSection === "results"}
          onToggle={() => toggleSection("results")}
          unmountWhenClosed
        >
          <AdminResultsSection
            groupMatches={matches}
            results={results}
            resultDrafts={resultDrafts}
            editingResults={editingResults}
            onResultChange={updateResultDraft}
            onSaveResult={handleSaveResult}
            onEditResult={handleEditResult}
            onDeleteResult={handleDeleteResult}
          />
        </AdminAccordion>
      </div>
    </main>
  );
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "neutral" | "lime" | "yellow" | "cyan";
}) {
  const palette = {
    lime: { border: "border-[var(--fc-lime)]/30 bg-[var(--fc-lime)]/[0.06]", color: "text-[var(--fc-lime)]" },
    yellow: { border: "border-[var(--fc-yellow)]/30 bg-[var(--fc-yellow)]/[0.06]", color: "text-[var(--fc-yellow)]" },
    cyan: { border: "border-[var(--fc-cyan)]/30 bg-[var(--fc-cyan)]/[0.06]", color: "text-[var(--fc-cyan)]" },
    neutral: { border: "border-white/[0.07] bg-white/[0.03]", color: "text-white" },
  }[tone];

  return (
    <div className={`fc-broadcast-cut-sm relative flex flex-col gap-1 border p-4 ${palette.border}`}>
      <div className="flex items-center gap-2">
        <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${palette.color.replace("text-", "bg-")}`} />
        <p className="fc-display-italic text-[0.66rem] uppercase tracking-[0.22em] text-slate-400">
          {label}
        </p>
      </div>
      <p className={`fc-stencil text-3xl ${palette.color}`}>{value}</p>
    </div>
  );
}

function AccessCard({ title, href, label }: { title: string; href: string; label: string }) {
  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-16 sm:px-6 lg:px-8">
      <div className="fc-card p-8 text-center">
        <h1 className="fc-display-italic text-3xl uppercase tracking-[0.02em] text-white">{title}</h1>
        <Link href={href} className="fc-cta-fifa mt-6">
          <span aria-hidden>▸</span> {label}
        </Link>
      </div>
    </main>
  );
}
