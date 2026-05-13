"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AdminResultCard } from "@/components/AdminResultCard";
import { matches, type Matchday, type Stage } from "@/data/matches";
import { useAuth } from "@/hooks/useAuth";
import { useProdeStore } from "@/hooks/useProdeStore";
import { useUsers } from "@/hooks/useUsers";
import {
  calculatePoints,
  emptyScore,
  getParticipantUsers,
  parseScore,
  type ScoreInput,
} from "@/lib/prode";
import { clearLocalProdeData } from "@/lib/storage";
import { getAllGeneratedMatches } from "@/lib/standings";

type AdminFilter =
  | { type: "todos"; label: "Todos" }
  | { type: "fecha"; label: string; value: Matchday }
  | { type: "fase"; label: string; value: Exclude<Stage, "grupos"> };

const adminFilters: AdminFilter[] = [
  { type: "todos", label: "Todos" },
  { type: "fecha", label: "Fecha 1", value: 1 },
  { type: "fecha", label: "Fecha 2", value: 2 },
  { type: "fecha", label: "Fecha 3", value: 3 },
  { type: "fase", label: "16avos", value: "16avos" },
  { type: "fase", label: "Octavos", value: "octavos" },
  { type: "fase", label: "Cuartos", value: "cuartos" },
  { type: "fase", label: "Semifinal", value: "semifinal" },
  { type: "fase", label: "Final", value: "final" },
];

export default function AdminPage() {
  const { user, isReady: isAuthReady } = useAuth();
  const {
    predictions,
    savedPredictions,
    results,
    saveResult,
    deleteResult,
    recalculatePoints,
  } = useProdeStore();
  const { registeredUsers, updatePaymentStatus } = useUsers();
  const participants = getParticipantUsers(registeredUsers);
  const allMatches = useMemo(() => getAllGeneratedMatches(results), [results]);
  const [activeFilter, setActiveFilter] = useState<AdminFilter>(adminFilters[0]);
  const [resultDrafts, setResultDrafts] = useState<Record<string, ScoreInput>>({});
  const [editingResults, setEditingResults] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setResultDrafts((currentDrafts) => {
      const nextDrafts = { ...currentDrafts };

      allMatches.forEach((match) => {
        if (!nextDrafts[match.id]) {
          nextDrafts[match.id] = results[match.id] ?? emptyScore;
        }
      });

      return nextDrafts;
    });
  }, [allMatches, results]);

  const filteredMatches = useMemo(() => {
    if (activeFilter.type === "todos") {
      return allMatches;
    }

    if (activeFilter.type === "fecha") {
      return matches.filter((match) => match.matchday === activeFilter.value);
    }

    return allMatches.filter((match) => match.stage === activeFilter.value);
  }, [activeFilter, allMatches]);

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

  const loadedResults = allMatches.filter((match) => parseScore(results[match.id])).length;
  const savedPredictionsCount = allMatches.reduce(
    (total, match) =>
      total +
      participants.filter((participant) => savedPredictions[participant.username]?.[match.id])
        .length,
    0,
  );

  const updateResultDraft = (matchId: string, side: keyof ScoreInput, value: string) => {
    setResultDrafts((currentDrafts) => ({
      ...currentDrafts,
      [matchId]: {
        ...(currentDrafts[matchId] ?? emptyScore),
        [side]: value,
      },
    }));
  };

  const handleSaveResult = (matchId: string) => {
    const saved = saveResult(matchId, resultDrafts[matchId] ?? emptyScore);

    if (saved) {
      setEditingResults((current) => ({ ...current, [matchId]: false }));
      recalculatePoints();
    }
  };

  const handleEditResult = (matchId: string) => {
    setResultDrafts((currentDrafts) => ({
      ...currentDrafts,
      [matchId]: results[matchId] ?? currentDrafts[matchId] ?? emptyScore,
    }));
    setEditingResults((current) => ({ ...current, [matchId]: true }));
  };

  const handleDeleteResult = (matchId: string) => {
    deleteResult(matchId);
    setResultDrafts((currentDrafts) => ({ ...currentDrafts, [matchId]: emptyScore }));
    setEditingResults((current) => ({ ...current, [matchId]: true }));
    recalculatePoints();
  };

  const handleClearLocalData = () => {
    clearLocalProdeData();
    setResultDrafts({});
    setEditingResults({});
  };

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-6 lg:px-8 lg:py-12">
      <section className="mb-8 flex flex-col justify-between gap-5 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.28em] text-emerald-200">
            Panel admin
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
            Cargar resultados reales
          </h1>
          <p className="mt-4 max-w-2xl text-slate-400">
            El admin puede cargar resultados, ver predicciones de participantes y recalcular
            puntos.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={recalculatePoints}
            className="rounded-full bg-gradient-to-r from-emerald-300 to-lime-300 px-6 py-3 font-black text-slate-950 shadow-lg shadow-emerald-950/20 transition hover:-translate-y-0.5"
          >
            Recalcular puntos
          </button>
          <button
            type="button"
            onClick={handleClearLocalData}
            className="rounded-full border border-red-300/30 bg-red-300/10 px-6 py-3 font-bold text-red-100 transition hover:-translate-y-0.5 hover:bg-red-300/15"
          >
            Limpiar datos locales
          </button>
        </div>
      </section>

      <div className="mb-8 grid gap-4 md:grid-cols-3">
        {[
          [allMatches.length, "partidos"],
          [loadedResults, "resultados cargados"],
          [savedPredictionsCount, "predicciones guardadas"],
        ].map(([value, label]) => (
          <div key={label} className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.075] to-white/[0.035] p-6 shadow-lg shadow-black/10">
            <p className="text-4xl font-black text-white">{value}</p>
            <p className="mt-2 text-xs uppercase tracking-[0.22em] text-slate-400">{label}</p>
          </div>
        ))}
      </div>

      <section className="mb-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.28em] text-emerald-200">
              Resultados manuales
            </p>
            <h2 className="mt-2 text-2xl font-black text-white">Filtrar partidos</h2>
          </div>
          <p className="text-sm text-slate-300">
            Mostrando {filteredMatches.length} de {allMatches.length} partidos.
          </p>
        </div>
        <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
          {adminFilters.map((filter) => {
            const isActive =
              activeFilter.type === filter.type &&
              (filter.type === "todos" ||
                (activeFilter.type !== "todos" && activeFilter.value === filter.value));

            return (
              <button
                key={filter.label}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition hover:-translate-y-0.5 ${
                  isActive
                    ? "bg-emerald-300 text-slate-950 shadow-lg shadow-emerald-950/20"
                    : "border border-white/10 bg-white/[0.05] text-slate-200 hover:border-white/20 hover:bg-white/10"
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="mb-8 rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.075] to-white/[0.035] p-6 shadow-2xl shadow-black/20">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.28em] text-emerald-200">
              Usuarios registrados
            </p>
            <h2 className="mt-2 text-3xl font-black text-white">Revisión de pagos</h2>
            <p className="mt-2 text-sm text-slate-300">
              Revisá los comprobantes enviados por los participantes y aprobá o rechazá cada
              inscripción.
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm font-bold text-emerald-100">
            Inscripción: $10.000
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {registeredUsers.length ? (
            registeredUsers.map((registeredUser) => (
              <div
                key={registeredUser.username}
                className="grid gap-4 rounded-2xl border border-white/10 bg-slate-950/60 p-4 transition hover:-translate-y-0.5 hover:border-white/20 lg:grid-cols-[1fr_220px_auto] lg:items-center"
              >
                <div>
                  <p className="text-lg font-black text-white">{registeredUser.displayName}</p>
                  <p className="text-sm text-slate-300">Usuario: {registeredUser.username}</p>
                  <p
                    className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-black ${
                      registeredUser.paymentStatus === "approved"
                        ? "bg-emerald-300/15 text-emerald-200"
                        : registeredUser.paymentStatus === "rejected"
                          ? "bg-red-300/15 text-red-200"
                          : registeredUser.paymentStatus === "pending_review"
                            ? "bg-cyan-300/15 text-cyan-200"
                          : "bg-amber-300/15 text-amber-200"
                    }`}
                  >
                    {registeredUser.paymentStatus === "approved"
                      ? "Pago aprobado"
                      : registeredUser.paymentStatus === "rejected"
                        ? "Pago rechazado"
                        : registeredUser.paymentStatus === "pending_review"
                          ? "Pendiente de revisión"
                          : "Sin comprobante"}
                  </p>
                  {registeredUser.paymentProof ? (
                    <p className="mt-2 text-sm font-bold text-emerald-100">
                      Comprobante cargado: {registeredUser.paymentProof.fileName}
                    </p>
                  ) : null}
                  {registeredUser.paymentProof?.uploadedAt ? (
                    <p className="mt-2 text-xs text-slate-400">
                      Enviado: {new Date(registeredUser.paymentProof.uploadedAt).toLocaleString()} ·{" "}
                      {(registeredUser.paymentProof.fileSize / 1024).toFixed(0)} KB
                    </p>
                  ) : null}
                </div>
                {registeredUser.paymentProof ? (
                  <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4 text-sm text-emerald-100">
                    <p className="font-black">Comprobante recibido</p>
                    <p className="mt-1 break-all text-emerald-50">{registeredUser.paymentProof.fileName}</p>
                    <p className="mt-1 text-xs text-emerald-100/80">
                      {registeredUser.paymentProof.fileType}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-slate-400">
                    Sin comprobante cargado
                  </div>
                )}
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() =>
                      updatePaymentStatus(registeredUser.username, "approved", {
                        paidAt: new Date().toISOString(),
                        rejectedAt: undefined,
                      })
                    }
                    className="rounded-full bg-emerald-300 px-5 py-2 text-sm font-black text-slate-950 shadow-lg shadow-emerald-950/20 transition hover:-translate-y-0.5"
                  >
                    Aprobar pago
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updatePaymentStatus(registeredUser.username, "rejected", {
                        rejectedAt: new Date().toISOString(),
                      })
                    }
                    className="rounded-full border border-red-300/30 bg-red-300/10 px-5 py-2 text-sm font-bold text-red-100 transition hover:-translate-y-0.5 hover:bg-red-300/15"
                  >
                    Rechazar pago
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-slate-300">
              Todavía no hay usuarios registrados desde la página de registro.
            </div>
          )}
        </div>
      </section>

      <section className="mb-8">
        <div className="mb-5">
          <p className="text-sm font-bold uppercase tracking-[0.28em] text-emerald-200">
            Carga manual
          </p>
          <h2 className="mt-2 text-2xl font-black text-white">Resultados de partidos</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Esta grilla es solo para cargar, editar o borrar resultados reales. El admin no carga
            predicciones desde este panel.
          </p>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          {filteredMatches.map((match) => {
            const hasSavedResult = Boolean(parseScore(results[match.id]));
            const isEditing = editingResults[match.id] ?? !hasSavedResult;

            return (
              <AdminResultCard
                key={match.id}
                match={match}
                result={isEditing ? resultDrafts[match.id] : results[match.id]}
                canEditResult={isEditing}
                hasSavedResult={hasSavedResult}
                onResultChange={(side, value) => updateResultDraft(match.id, side, value)}
                onSaveResult={() => handleSaveResult(match.id)}
                onEditResult={() => handleEditResult(match.id)}
                onDeleteResult={() => handleDeleteResult(match.id)}
              />
            );
          })}
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.075] to-white/[0.035] p-5 shadow-xl shadow-black/10">
          <h2 className="text-2xl font-black text-white">Predicciones guardadas</h2>
          <p className="mt-2 text-sm text-slate-400">
            Vista separada para revisar lo que guardaron los participantes. No se cargan
            predicciones desde el panel admin.
          </p>
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {filteredMatches.map((match) => (
              <div key={match.id} className="rounded-2xl border border-white/10 bg-slate-950/55 p-4 transition hover:border-white/20">
                <p className="text-sm font-bold text-emerald-200">
                  {match.group} {match.matchday ? `· Fecha ${match.matchday}` : ""}
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  {match.homeTeam} vs {match.awayTeam}
                </p>
                <div className="mt-3 space-y-2">
                  {participants.map((participant) => {
                    const prediction = predictions[participant.username]?.[match.id];
                    const isSaved = savedPredictions[participant.username]?.[match.id];
                    const points = calculatePoints(prediction, results[match.id], isSaved);

                    return (
                      <div
                        key={participant.username}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <span className="text-slate-400">{participant.displayName}</span>
                        <span className="font-bold text-white">
                          {isSaved && prediction
                            ? `${prediction.home}-${prediction.away} · ${
                                points ?? "sin resultado"
                              } puntos`
                            : "Sin predicción"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
      </section>
    </main>
  );
}

function AccessCard({ title, href, label }: { title: string; href: string; label: string }) {
  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-16 sm:px-6 lg:px-8">
      <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-8 text-center shadow-2xl shadow-black/20">
        <h1 className="text-3xl font-black text-white">{title}</h1>
        <Link
          href={href}
          className="mt-6 inline-flex rounded-full bg-emerald-300 px-6 py-3 font-black text-slate-950 shadow-lg shadow-emerald-950/20 transition hover:-translate-y-0.5"
        >
          {label}
        </Link>
      </div>
    </main>
  );
}
