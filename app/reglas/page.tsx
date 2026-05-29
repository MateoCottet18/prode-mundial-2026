import { PageHeader } from "@/components/PageHeader";

export default function ReglasPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-6 lg:px-8 lg:py-14">
      <PageHeader
        overline="Reglamento oficial"
        title="Cómo se juega el prode"
        description="Todo funciona con usuarios, pago manual por alias, predicciones guardadas y puntos automáticos cuando se cargan resultados reales."
        tone="cyan"
      />

      <section className="grid gap-4 md:grid-cols-2">
        {[
          [
            "Cómo participar",
            "Registrate como participante, transferí la inscripción al alias mundial.prode.mp y declarás quién hizo la transferencia desde /pago.",
          ],
          [
            "Inscripción",
            "La inscripción cuesta $10.000 pesos. Alias: mundial.prode.mp. Titular: Mateo Cottet.",
          ],
          [
            "Premios",
            "Hay tres premios: $250.000 al primero, 2 camisetas de la Selección Argentina al segundo y un kit sublimado personalizado al tercero.",
          ],
          [
            "Pago pendiente",
            "Si tu declaración está pendiente de revisión, vas a poder iniciar sesión, pero no cargar predicciones hasta que el admin apruebe el pago.",
          ],
          [
            "Cuándo cargar predicciones",
            "Las predicciones se cargan desde /partidos. Podés cargar fase de grupos y cruces eliminatorios cuando estén disponibles.",
          ],
          [
            "Qué puede hacer el admin",
            "El admin carga resultados reales, revisa predicciones, recalcula puntos y aprueba o rechaza pagos.",
          ],
        ].map(([title, description], idx) => {
          const dotColors = [
            "bg-[var(--fc-lime)]",
            "bg-[var(--fc-magenta)]",
            "bg-[var(--fc-yellow)]",
            "bg-[var(--fc-cyan)]",
            "bg-[var(--fc-orange)]",
            "bg-[var(--fc-lime)]",
          ];
          return (
            <article
              key={title}
              className="fc-card fc-card-accent relative p-6 transition-colors hover:border-[var(--fc-lime)]/25"
            >
              <div className="flex items-center gap-2">
                <span aria-hidden className={`h-2 w-2 rotate-45 ${dotColors[idx % dotColors.length]}`} />
                <p className="fc-display-italic text-[0.66rem] uppercase tracking-[0.22em] text-slate-500">
                  Capítulo {String(idx + 1).padStart(2, "0")}
                </p>
              </div>
              <h2 className="mt-3 fc-display-italic text-xl uppercase tracking-[0.04em] text-white">
                {title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">{description}</p>
            </article>
          );
        })}
      </section>

      <section className="mt-14">
        <div className="mb-5 flex items-center gap-2.5">
          <span aria-hidden className="h-2 w-2 rotate-45 bg-[var(--fc-lime)]" />
          <p className="fc-display-italic text-[0.7rem] uppercase tracking-[0.32em] text-[var(--fc-lime)]">
            Sistema de puntos
          </p>
        </div>
        <h2 className="mb-6 fc-display-italic text-2xl uppercase leading-[0.95] tracking-[0.005em] text-white sm:text-3xl">
          Cómo se suman puntos
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              points: "3",
              label: "PTS",
              title: "Resultado exacto",
              description:
                "Si el resultado real es Argentina 1 - 0 Argelia y tu predicción fue 1 - 0.",
              tone: "lime" as const,
            },
            {
              points: "1",
              label: "PT",
              title: "Ganador o empate",
              description:
                "Si el resultado real es Argentina 1 - 0 y tu predicción fue Argentina 2 - 0.",
              tone: "yellow" as const,
            },
            {
              points: "0",
              label: "PTS",
              title: "No acertaste",
              description:
                "Si tu predicción no coincide con el ganador ni con el empate del resultado real.",
              tone: "magenta" as const,
            },
          ].map(({ points, label, title, description, tone }) => {
            const palette = {
              lime: "border-[var(--fc-lime)]/35 bg-[var(--fc-lime)]/[0.06] text-[var(--fc-lime)]",
              yellow: "border-[var(--fc-yellow)]/35 bg-[var(--fc-yellow)]/[0.06] text-[var(--fc-yellow)]",
              magenta: "border-[var(--fc-magenta)]/35 bg-[var(--fc-magenta)]/[0.06] text-[var(--fc-magenta)]",
            }[tone];
            return (
              <article
                key={title}
                className={`fc-broadcast-cut relative flex h-full flex-col gap-3 border p-6 transition-colors ${palette}`}
              >
                <div className="flex items-baseline gap-2">
                  <p className="fc-stencil text-6xl leading-none">{points}</p>
                  <p className="fc-display-italic text-sm uppercase tracking-[0.22em]">
                    {label}
                  </p>
                </div>
                <h2 className="fc-display-italic text-xl uppercase tracking-[0.04em] text-white">
                  {title}
                </h2>
                <p className="text-sm leading-6 text-slate-300">{description}</p>
              </article>
            );
          })}
        </div>
      </section>

      {/* CRITERIO DE DESEMPATE */}
      <section className="mt-14">
        <div className="mb-5 flex items-center gap-2.5">
          <span aria-hidden className="h-2 w-2 rotate-45 bg-[var(--fc-magenta)]" />
          <p className="fc-display-italic text-[0.7rem] uppercase tracking-[0.32em] text-[var(--fc-magenta)]">
            Criterio de desempate
          </p>
        </div>
        <h2 className="mb-6 fc-display-italic text-2xl uppercase leading-[0.95] tracking-[0.005em] text-white sm:text-3xl">
          Cómo se rompen los empates
        </h2>

        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          {/* Pasos del desempate */}
          <article className="fc-broadcast-cut relative overflow-hidden border border-white/[0.07] bg-[#0a1018] p-6">
            <div aria-hidden className="absolute inset-x-4 top-0 h-[2px] fc-flag-stripe opacity-80" />
            <p className="text-sm leading-6 text-slate-300">
              En caso de empate en puntos entre dos o más participantes, se define por:
            </p>
            <ol className="mt-5 space-y-3">
              {[
                {
                  title: "Resultados exactos",
                  description: "Mayor cantidad de resultados exactos acertados (3 puntos).",
                  tone: "lime" as const,
                  icon: "★",
                },
                {
                  title: "Aciertos totales",
                  description: "Si persiste el empate, mayor cantidad total de partidos acertados (incluye exactos y ganador/empate).",
                  tone: "cyan" as const,
                  icon: "✓",
                },
                {
                  title: "Orden de inscripción",
                  description: "Si todo lo anterior queda igual, gana el participante que se haya inscripto antes. Aunque sea injusto, hay que definir un solo ganador.",
                  tone: "neutral" as const,
                  icon: "⏱",
                },
              ].map((step, idx) => {
                const palette = {
                  lime: {
                    border: "border-[var(--fc-lime)]/35",
                    bg: "bg-[var(--fc-lime)]/[0.06]",
                    iconCls: "bg-[var(--fc-lime)] text-slate-950",
                    label: "text-[var(--fc-lime)]",
                  },
                  cyan: {
                    border: "border-[var(--fc-cyan)]/35",
                    bg: "bg-[var(--fc-cyan)]/[0.06]",
                    iconCls: "bg-[var(--fc-cyan)] text-slate-950",
                    label: "text-[var(--fc-cyan)]",
                  },
                  neutral: {
                    border: "border-white/15",
                    bg: "bg-white/[0.03]",
                    iconCls: "bg-white/20 text-white",
                    label: "text-slate-300",
                  },
                }[step.tone];
                return (
                  <li
                    key={step.title}
                    className={`fc-broadcast-cut-sm relative flex items-start gap-3 border p-4 ${palette.border} ${palette.bg}`}
                  >
                    <span
                      className={`fc-stencil grid h-10 w-10 flex-none place-items-center text-xl ${palette.iconCls}`}
                      style={{ clipPath: "polygon(20% 0, 100% 0, 80% 100%, 0 100%)" }}
                    >
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className={`fc-display-italic text-[0.66rem] uppercase tracking-[0.22em] ${palette.label}`}>
                        {step.icon} {step.title}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-slate-300">{step.description}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </article>

          {/* Ejemplo aclaratorio */}
          <article className="fc-broadcast-cut relative overflow-hidden border border-[var(--fc-lime)]/25 bg-[var(--fc-lime)]/[0.04] p-6">
            <div aria-hidden className="absolute inset-x-4 top-0 h-[2px] fc-flag-stripe opacity-80" />
            <p className="fc-display-italic text-[0.66rem] uppercase tracking-[0.22em] text-[var(--fc-lime)]">
              Importante
            </p>
            <h3 className="mt-2 fc-display-italic text-xl uppercase tracking-[0.04em] text-white">
              Un exacto pesa más
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Un resultado exacto vale más que sumar varios aciertos parciales en el desempate.
            </p>
            <div className="mt-4 space-y-3">
              <div className="fc-broadcast-cut-sm border border-[var(--fc-lime)]/40 bg-[var(--fc-lime)]/[0.08] p-3">
                <p className="fc-display-italic text-[0.62rem] uppercase tracking-[0.22em] text-[var(--fc-lime)]">
                  Caso A · prioritario
                </p>
                <p className="mt-1 text-sm text-white">
                  <span className="fc-stencil text-lg text-[var(--fc-lime)]">2-1</span> exacto en un partido →{" "}
                  <span className="font-bold">3 pts</span>, <span className="font-bold">1 exacto</span>.
                </p>
              </div>
              <div className="fc-broadcast-cut-sm border border-white/15 bg-white/[0.03] p-3">
                <p className="fc-display-italic text-[0.62rem] uppercase tracking-[0.22em] text-slate-400">
                  Caso B
                </p>
                <p className="mt-1 text-sm text-white">
                  3 partidos con ganador/empate acertado pero sin exacto →{" "}
                  <span className="font-bold">3 pts</span>,{" "}
                  <span className="font-bold">0 exactos</span>.
                </p>
              </div>
              <p className="text-sm leading-6 text-slate-300">
                Misma cantidad de puntos, pero el <span className="font-bold text-[var(--fc-lime)]">caso A</span>{" "}
                queda <span className="font-bold text-white">arriba</span> en la tabla por el desempate.
              </p>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
