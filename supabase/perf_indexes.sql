-- =============================================================================
-- Prode Mundial 2026 — perf_indexes.sql
--
-- Migración idempotente para dejar la base optimizada para ~500 usuarios
-- concurrentes durante la transmisión de un partido. Se puede correr varias
-- veces sobre la base productiva sin efectos secundarios: todos los índices
-- usan `if not exists` y la view se redefine con `create or replace`.
--
-- Cobertura previa (ya existente, no se duplica):
--   * profiles.id            → primary key (implícito)
--   * profiles.email         → unique constraint (implícito)
--   * profiles.username      → unique constraint (implícito)
--   * predictions.(user_id, match_id)  → unique constraint (cubre user_id)
--   * results.match_id       → primary key (implícito)
--   * payments.(user_id, uploaded_at desc) → payments_user_id_uploaded_at_desc_idx
--   * qualification_overrides.slot → unique constraint (implícito)
--
-- Lo que agrega este script:
--   * predictions.match_id        → recalculos por partido + lookups por match
--   * profiles.role               → acelera is_admin() y filtros por rol
--   * profiles.payment_status     → admin filtra pendientes/aprobados
--   * matches.stage               → filtra fase eliminatoria / grupos
--   * matches.matchday            → ordenar/filtrar por fecha 1/2/3
--   * VIEW prediction_aggregates  → ranking en 1 query agregada (≈500 filas
--                                   en vez de ≈52.000 filas por refresh)
-- =============================================================================

create index if not exists predictions_match_id_idx
  on public.predictions (match_id);

-- Partial index: el filtro habitual en RLS es role = 'admin' (muy pocas filas).
-- Un index parcial pesa < 1KB y acelera muchísimo is_admin().
create index if not exists profiles_role_admin_idx
  on public.profiles (id)
  where role = 'admin';

-- Index general por role para queries del tipo `where role = 'participante'`
-- que usa el ranking público / admin panel.
create index if not exists profiles_role_idx
  on public.profiles (role);

-- payment_status: el admin filtra "pending_review" en cada refresco del panel.
-- Con 500 perfiles, sin index hace seq scan; con index, lookup directo.
create index if not exists profiles_payment_status_idx
  on public.profiles (payment_status);

create index if not exists matches_stage_idx
  on public.matches (stage);

create index if not exists matches_matchday_idx
  on public.matches (matchday)
  where matchday is not null;

-- ---------------------------------------------------------------------------
-- VIEW: prediction_aggregates
--
-- Pre-calcula, en SQL, los totales por usuario que el ranking necesita:
--   * points                 → SUM(points)        (criterio principal)
--   * exact_count            → predicciones con 3 pts (1° desempate)
--   * correct_outcomes_count → predicciones con 1 ó 3 pts (2° desempate)
--   * saved_count            → cantidad total de predicciones cargadas
--
-- Se apoya en `predictions.points`, que ya queda consistente porque
-- `recalculatePredictionPoints` corre tras cada save/delete de result. La view
-- se materializa al vuelo (no es materialized view, no hay que refrescarla).
--
-- Antes: el cliente bajaba ~52.000 filas (500 users × 104 matches) y las
-- iteraba en JS calculando puntos en el navegador.
-- Ahora: el cliente baja ~500 filas pre-agregadas; el cálculo lo hace Postgres
-- usando los índices `predictions(user_id)` y `predictions(points)`.
-- ---------------------------------------------------------------------------
create or replace view public.prediction_aggregates as
select
  user_id,
  coalesce(sum(points), 0)::int                                    as points,
  count(*) filter (where points = 3)::int                          as exact_count,
  count(*) filter (where points >= 1)::int                         as correct_outcomes_count,
  count(*)::int                                                    as saved_count
from public.predictions
group by user_id;

-- La view hereda RLS de `public.predictions`. Como predictions tiene policy
-- `select using (true)` (lectura pública para el ranking), la view también es
-- legible por cualquier rol. No hace falta abrir nada extra.
grant select on public.prediction_aggregates to anon, authenticated;

-- ---------------------------------------------------------------------------
-- ANALYZE: refresca las estadísticas del planner Postgres para que use los
-- índices recién creados. No tarda nada en tablas chicas.
-- ---------------------------------------------------------------------------
analyze public.predictions;
analyze public.profiles;
analyze public.matches;
analyze public.results;
analyze public.payments;
analyze public.qualification_overrides;

-- Refresca el schema cache de PostgREST para que los cambios queden visibles
-- en supabase-js inmediatamente.
notify pgrst, 'reload schema';
