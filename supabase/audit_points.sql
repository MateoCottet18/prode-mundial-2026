-- =============================================================================
-- Prode Mundial 2026 — audit_points.sql
--
-- IMPORTANTE: ejecutar UN bloque a la vez en el SQL Editor.
-- Si pegás todo el archivo junto → "Failed to fetch (api.supabase.com)".
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0) RÁPIDO — ¿hay discrepancias? (correr primero)
-- ---------------------------------------------------------------------------
select count(*) as discrepancias
from public.predictions p
join public.results r on r.match_id = p.match_id
where p.points is distinct from case
  when p.home_goals = r.home_goals and p.away_goals = r.away_goals then 3
  when sign(p.home_goals - p.away_goals) = sign(r.home_goals - r.away_goals) then 1
  else 0
end;

-- ---------------------------------------------------------------------------
-- 1) Detalle de discrepancias (solo si el count > 0)
-- ---------------------------------------------------------------------------
select
  pr.username,
  p.match_id,
  p.home_goals || '-' || p.away_goals as prediccion,
  r.home_goals || '-' || r.away_goals as resultado_real,
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
-- 2) Caso boca2000 — Chequia vs Sudáfrica (a-3)
-- ---------------------------------------------------------------------------
select
  pr.username,
  pr.id as user_id,
  p.match_id,
  m.home_team,
  m.away_team,
  p.home_goals || '-' || p.away_goals as prediccion,
  r.home_goals || '-' || r.away_goals as resultado,
  p.points as points_actual,
  case
    when p.home_goals = r.home_goals and p.away_goals = r.away_goals then 3
    when sign(p.home_goals - p.away_goals) = sign(r.home_goals - r.away_goals) then 1
    else 0
  end as points_expected,
  p.updated_at,
  p.points_updated_at
from public.profiles pr
left join public.predictions p on p.user_id = pr.id and p.match_id = 'a-3'
left join public.results r on r.match_id = 'a-3'
left join public.matches m on m.id = 'a-3'
where pr.username = 'boca2000';

-- ---------------------------------------------------------------------------
-- 3) Resumen por partido con resultado cargado
-- ---------------------------------------------------------------------------
with scored as (
  select
    p.match_id,
    p.points as points_actual,
    case
      when p.home_goals = r.home_goals and p.away_goals = r.away_goals then 3
      when sign(p.home_goals - p.away_goals) = sign(r.home_goals - r.away_goals) then 1
      else 0
    end as points_expected
  from public.predictions p
  join public.results r on r.match_id = p.match_id
)
select
  match_id,
  count(*) as predicciones_con_resultado,
  count(*) filter (where points_actual is distinct from points_expected) as discrepancias
from scored
group by match_id
having count(*) filter (where points_actual is distinct from points_expected) > 0
order by match_id;

-- ---------------------------------------------------------------------------
-- 4) Ranking boca2000 (aggregates)
-- ---------------------------------------------------------------------------
select
  pr.username,
  coalesce(agg.points, 0) as points_ranking,
  coalesce(agg.exact_count, 0) as exactos,
  coalesce(agg.correct_outcomes_count, 0) as aciertos,
  coalesce(agg.saved_count, 0) as guardadas
from public.profiles pr
left join public.prediction_aggregates agg on agg.user_id = pr.id
where pr.username = 'boca2000';
