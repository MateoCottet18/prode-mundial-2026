-- =============================================================================
-- Prode Mundial 2026 — audit_points_global.sql
--
-- Auditoría GLOBAL de puntos. Ejecutar UN bloque a la vez.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- A) RESUMEN GLOBAL
-- ---------------------------------------------------------------------------
select
  (select count(*) from public.predictions) as total_predictions,
  (select count(*) from public.results) as total_results,
  (select count(*)
     from public.predictions p
     join public.results r on r.match_id = p.match_id) as predictions_con_resultado,
  (select count(*)
     from public.predictions p
     join public.results r on r.match_id = p.match_id
    where p.points is distinct from case
      when p.home_goals = r.home_goals and p.away_goals = r.away_goals then 3
      when sign(p.home_goals - p.away_goals) = sign(r.home_goals - r.away_goals) then 1
      else 0
    end) as inconsistencias;

-- ---------------------------------------------------------------------------
-- B) DETALLE DE INCONSISTENCIAS (debe devolver 0 filas si todo OK)
-- ---------------------------------------------------------------------------
select
  pr.username,
  p.match_id,
  p.home_goals || '-' || p.away_goals as prediccion,
  r.home_goals || '-' || r.away_goals as resultado,
  p.points as points_actual,
  case
    when p.home_goals = r.home_goals and p.away_goals = r.away_goals then 3
    when sign(p.home_goals - p.away_goals) = sign(r.home_goals - r.away_goals) then 1
    else 0
  end as points_expected
from public.predictions p
join public.results r on r.match_id = p.match_id
join public.profiles pr on pr.id = p.user_id
where p.points is distinct from case
  when p.home_goals = r.home_goals and p.away_goals = r.away_goals then 3
  when sign(p.home_goals - p.away_goals) = sign(r.home_goals - r.away_goals) then 1
  else 0
end
order by p.match_id, pr.username;

-- ---------------------------------------------------------------------------
-- C) RESUMEN POR PARTIDO CON RESULTADO
-- ---------------------------------------------------------------------------
select
  p.match_id,
  count(*) as predicciones,
  count(*) filter (
    where p.points is distinct from case
      when p.home_goals = r.home_goals and p.away_goals = r.away_goals then 3
      when sign(p.home_goals - p.away_goals) = sign(r.home_goals - r.away_goals) then 1
      else 0
    end
  ) as inconsistencias
from public.predictions p
join public.results r on r.match_id = p.match_id
group by p.match_id
order by p.match_id;

-- ---------------------------------------------------------------------------
-- D) boca2000 — Chequia vs Sudáfrica (a-3)
-- ---------------------------------------------------------------------------
select
  pr.username,
  p.match_id,
  p.home_goals || '-' || p.away_goals as prediccion,
  r.home_goals || '-' || r.away_goals as resultado,
  p.points,
  case
    when p.home_goals = r.home_goals and p.away_goals = r.away_goals then 3
    when sign(p.home_goals - p.away_goals) = sign(r.home_goals - r.away_goals) then 1
    else 0
  end as points_esperado
from public.profiles pr
join public.predictions p on p.user_id = pr.id and p.match_id = 'a-3'
join public.results r on r.match_id = 'a-3'
where pr.username = 'boca2000';

-- ---------------------------------------------------------------------------
-- E) RANKING TOP 20 (participantes, sin admin)
-- ---------------------------------------------------------------------------
select
  pr.username,
  pr.name,
  coalesce(agg.points, 0) as points,
  coalesce(agg.exact_count, 0) as exactos,
  coalesce(agg.correct_outcomes_count, 0) as aciertos,
  coalesce(agg.saved_count, 0) as guardadas
from public.profiles pr
left join public.prediction_aggregates agg on agg.user_id = pr.id
where pr.role = 'participante'
order by
  coalesce(agg.points, 0) desc,
  coalesce(agg.exact_count, 0) desc,
  coalesce(agg.correct_outcomes_count, 0) desc,
  pr.username asc
limit 20;

-- ---------------------------------------------------------------------------
-- F) REPARACIÓN (solo si inconsistencias > 0)
-- Requiere repair_points.sql desplegado, o correr manualmente:
-- ---------------------------------------------------------------------------
-- select public.recalculate_all_prediction_points() as filas_corregidas;
