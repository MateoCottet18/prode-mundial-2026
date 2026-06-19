-- =============================================================================
-- Prode Mundial 2026 — audit_predictions.sql
--
-- IMPORTANTE — Edición tardía vs updated_at legacy:
--
--   Las 297 filas con updated_at >= kickoff NO prueban edición tardía real.
--   Ese campo también se actualizaba al recalcular points (admin).
--   No acusar usuarios con esa query sola.
--
--   ÚNICA prueba válida de edición tardía REAL (desde prediction_audit.sql):
--     prediction_audit_log + created_at < kickoff + changed_at >= kickoff
--     + old_home/old_away <> new_home/new_away
--
-- Ejecutar cada bloque por separado en el SQL Editor de Supabase.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Partidos: estado de cierre
-- -----------------------------------------------------------------------------
select
  m.id as match_id,
  m.home_team || ' vs ' || m.away_team as teams,
  m.kickoff_utc,
  m.kickoff_argentina as kickoff_legacy,
  coalesce(m.kickoff_utc, m.kickoff_argentina) as kickoff_instant,
  now() as now_utc,
  exists (select 1 from public.results r where r.match_id = m.id) as has_result,
  case
    when exists (select 1 from public.results r where r.match_id = m.id) then true
    when m.kickoff_utc is null then true
    when now() >= m.kickoff_utc then true
    else false
  end as locked,
  case
    when exists (select 1 from public.results r where r.match_id = m.id) then 'result_loaded'
    when m.kickoff_utc is null then 'schedule_unconfirmed'
    when now() >= m.kickoff_utc then 'kickoff_passed'
    else 'open'
  end as reason
from public.matches m
order by m.kickoff_utc nulls last, m.id;

-- -----------------------------------------------------------------------------
-- 2) PASADO — Contexto legacy (NO es prueba de edición tardía)
--
-- updated_at >= kickoff mezclaba recálculo de points + posible edición real.
-- -----------------------------------------------------------------------------
select
  count(*) filter (
    where p.updated_at >= coalesce(m.kickoff_utc, m.kickoff_argentina)
  ) as filas_con_updated_at_despues_kickoff,

  count(*) filter (
    where p.created_at < coalesce(m.kickoff_utc, m.kickoff_argentina)
      and p.updated_at >= coalesce(m.kickoff_utc, m.kickoff_argentina)
      and p.updated_at > p.created_at
  ) as sospechosos_historicos_no_concluyentes,

  'updated_at legacy NO prueba edición tardía — incluye recálculo de points' as nota
from public.predictions p
join public.matches m on m.id = p.match_id
where coalesce(m.kickoff_utc, m.kickoff_argentina) is not null;

-- -----------------------------------------------------------------------------
-- 2b) PASADO — Sospechosos históricos (NO prueba final)
--
-- Etiqueta: posible edición tardía O recálculo de puntos.
-- Sin audit log histórico NO se puede distinguir.
-- -----------------------------------------------------------------------------
select
  p.id,
  p.user_id,
  pr.username,
  p.match_id,
  m.home_team || ' vs ' || m.away_team as teams,
  p.home_goals,
  p.away_goals,
  p.points,
  p.created_at,
  p.updated_at,
  coalesce(p.points_updated_at, p.updated_at) as points_updated_at,
  coalesce(m.kickoff_utc, m.kickoff_argentina) as kickoff_instant,
  p.updated_at - coalesce(m.kickoff_utc, m.kickoff_argentina) as delta_desde_kickoff,
  'posible_edicion_tarde_o_recalc_puntos' as clasificacion,
  'NO es prueba final de edición tardía' as advertencia
from public.predictions p
join public.matches m on m.id = p.match_id
left join public.profiles pr on pr.id = p.user_id
where coalesce(m.kickoff_utc, m.kickoff_argentina) is not null
  and p.created_at < coalesce(m.kickoff_utc, m.kickoff_argentina)
  and p.updated_at >= coalesce(m.kickoff_utc, m.kickoff_argentina)
  and p.updated_at > p.created_at
order by p.updated_at desc;

-- -----------------------------------------------------------------------------
-- 3) DESDE AHORA — Ediciones tardías REALES (única prueba válida)
--
-- Definición:
--   - predicción existía antes del kickoff
--   - audit log registra cambio de marcador después del kickoff
-- Requiere: supabase/prediction_audit.sql
-- -----------------------------------------------------------------------------
select
  l.id as audit_id,
  l.prediction_id,
  l.user_id,
  pr.username,
  l.match_id,
  m.home_team || ' vs ' || m.away_team as teams,
  l.old_home_goals,
  l.old_away_goals,
  l.new_home_goals,
  l.new_away_goals,
  p.created_at as prediction_created_at,
  l.changed_at,
  coalesce(m.kickoff_utc, m.kickoff_argentina) as kickoff_instant,
  l.changed_at - coalesce(m.kickoff_utc, m.kickoff_argentina) as late_by,
  l.change_source,
  'edicion_tardia_real' as clasificacion
from public.prediction_audit_log l
join public.predictions p on p.id = l.prediction_id
join public.matches m on m.id = l.match_id
left join public.profiles pr on pr.id = l.user_id
where coalesce(m.kickoff_utc, m.kickoff_argentina) is not null
  and p.created_at < coalesce(m.kickoff_utc, m.kickoff_argentina)
  and l.changed_at >= coalesce(m.kickoff_utc, m.kickoff_argentina)
  and (
    l.old_home_goals is distinct from l.new_home_goals
    or l.old_away_goals is distinct from l.new_away_goals
  )
order by l.changed_at desc;

-- -----------------------------------------------------------------------------
-- 3a) DESDE AHORA — Resumen ediciones tardías reales (audit log)
-- -----------------------------------------------------------------------------
select
  count(*) as ediciones_tardias_reales
from public.prediction_audit_log l
join public.predictions p on p.id = l.prediction_id
join public.matches m on m.id = l.match_id
where coalesce(m.kickoff_utc, m.kickoff_argentina) is not null
  and p.created_at < coalesce(m.kickoff_utc, m.kickoff_argentina)
  and l.changed_at >= coalesce(m.kickoff_utc, m.kickoff_argentina)
  and (
    l.old_home_goals is distinct from l.new_home_goals
    or l.old_away_goals is distinct from l.new_away_goals
  );

-- -----------------------------------------------------------------------------
-- 4) Puntos guardados vs calculados (regla 3/1/0)
-- -----------------------------------------------------------------------------
with scored as (
  select
    p.id,
    p.user_id,
    p.match_id,
    p.home_goals as pred_home,
    p.away_goals as pred_away,
    r.home_goals as res_home,
    r.away_goals as res_away,
    p.points as stored_points,
    case
      when p.home_goals = r.home_goals and p.away_goals = r.away_goals then 3
      when sign(p.home_goals - p.away_goals) = sign(r.home_goals - r.away_goals) then 1
      else 0
    end as expected_points
  from public.predictions p
  join public.results r on r.match_id = p.match_id
)
select *
from scored
where coalesce(stored_points, -1) <> expected_points
order by match_id, user_id;

-- -----------------------------------------------------------------------------
-- 5) Resultados con predicciones sin recalcular
-- -----------------------------------------------------------------------------
with scored as (
  select
    p.id,
    p.match_id,
    m.home_team || ' vs ' || m.away_team as teams,
    p.points as stored_points,
    case
      when p.home_goals = r.home_goals and p.away_goals = r.away_goals then 3
      when sign(p.home_goals - p.away_goals) = sign(r.home_goals - r.away_goals) then 1
      else 0
    end as expected_points
  from public.predictions p
  join public.results r on r.match_id = p.match_id
  join public.matches m on m.id = p.match_id
)
select
  match_id,
  teams,
  count(*) filter (where stored_points is null) as predictions_null_points,
  count(*) filter (where coalesce(stored_points, -1) <> expected_points) as predictions_wrong_points,
  count(*) as total_predictions
from scored
group by match_id, teams
having count(*) filter (where stored_points is null or coalesce(stored_points, -1) <> expected_points) > 0
order by match_id;

-- -----------------------------------------------------------------------------
-- 6) Ranking top 20
-- -----------------------------------------------------------------------------
select
  pr.username,
  pr.name,
  coalesce(agg.points, 0) as points,
  coalesce(agg.exact_count, 0) as exactos,
  coalesce(agg.correct_outcomes_count, 0) as aciertos_simples,
  coalesce(agg.saved_count, 0) as predicciones_guardadas
from public.profiles pr
left join public.prediction_aggregates agg on agg.user_id = pr.id
where pr.role = 'participante'
order by
  coalesce(agg.points, 0) desc,
  coalesce(agg.exact_count, 0) desc,
  coalesce(agg.correct_outcomes_count, 0) desc,
  pr.username asc
limit 20;
