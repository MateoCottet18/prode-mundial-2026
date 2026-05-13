export default function ReglasPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-6 lg:px-8 lg:py-16">
      <section className="mb-10 max-w-3xl rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
        <p className="text-sm font-bold uppercase tracking-[0.28em] text-emerald-200">
          Reglas
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
          Reglas del Prode Mundial 2026
        </h1>
        <p className="mt-5 text-lg leading-8 text-slate-300">
          Todo funciona con usuarios, pago manual por alias, predicciones guardadas y puntos
          automáticos cuando se cargan resultados reales.
        </p>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        {[
          [
            "Cómo participar",
            "Registrate como participante, transferí la inscripción al alias mateo.cottet y subí el comprobante desde /pago.",
          ],
          [
            "Inscripción",
            "La inscripción cuesta $10.000 pesos. Alias: mateo.cottet. Titular: Mateo Cottet.",
          ],
          [
            "Premio",
            "El premio mayor es de $100.000 pesos para quien termine primero en la tabla de participantes.",
          ],
          [
            "Pago pendiente",
            "Si tu comprobante está pendiente de revisión, vas a poder iniciar sesión, pero no cargar predicciones hasta que el admin apruebe el pago.",
          ],
          [
            "Cuándo cargar predicciones",
            "Las predicciones se cargan desde /partidos. Podés cargar fase de grupos y cruces eliminatorios cuando estén disponibles.",
          ],
          [
            "Qué puede hacer el admin",
            "El admin carga resultados reales, revisa predicciones, recalcula puntos y aprueba o rechaza comprobantes de pago.",
          ],
        ].map(([title, description]) => (
          <article key={title} className="h-full rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.075] to-white/[0.035] p-6 shadow-lg shadow-black/10 transition hover:-translate-y-1 hover:border-emerald-300/25">
            <h2 className="text-xl font-black text-white">{title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">{description}</p>
          </article>
        ))}
      </section>

      <section className="mt-12">
        <div className="mb-5">
          <p className="text-sm font-bold uppercase tracking-[0.28em] text-emerald-200">
            Puntos
          </p>
          <h2 className="mt-3 text-3xl font-black text-white">Cómo se suman puntos</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
        {[
          [
            "3 puntos",
            "Acertaste resultado exacto",
            "Si el resultado real es Argentina 1 - 0 Argelia y tu predicción fue Argentina 1 - 0 Argelia.",
          ],
          [
            "1 punto",
            "Acertaste ganador o empate",
            "Si el resultado real es Argentina 1 - 0 Argelia y tu predicción fue Argentina 2 - 0 Argelia.",
          ],
          [
            "0 puntos",
            "No acertaste",
            "Si tu predicción no coincide con el ganador ni con el empate del resultado real.",
          ],
        ].map(([points, title, description]) => (
          <article key={title} className="h-full rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.075] to-white/[0.035] p-6 shadow-lg shadow-black/10 transition hover:-translate-y-1 hover:border-emerald-300/25">
            <p className="text-3xl font-black text-lime-200">{points}</p>
            <h2 className="mt-4 text-xl font-black text-white">{title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">{description}</p>
          </article>
        ))}
        </div>
      </section>
    </main>
  );
}
