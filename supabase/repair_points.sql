-- =============================================================================
-- Prode Mundial 2026 — repair_points.sql
--
-- Corrige predictions.points según regla 3/1/0 para TODAS las filas con
-- resultado cargado. Idempotente: se puede correr varias veces.
--
-- Ejecutar en Supabase SQL Editor (producción).
-- =============================================================================

-- Función: recalcular puntos de un partido (usada por trigger y manual)
create or replace function public.recalculate_prediction_points_for_match(p_match_id text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated integer;
begin
  update public.predictions p
     set points = case
       when p.home_goals = r.home_goals and p.away_goals = r.away_goals then 3
       when sign(p.home_goals - p.away_goals) = sign(r.home_goals - r.away_goals) then 1
       else 0
     end,
     points_updated_at = now()
    from public.results r
   where r.match_id = p_match_id
     and p.match_id = p_match_id
     and p.points is distinct from case
       when p.home_goals = r.home_goals and p.away_goals = r.away_goals then 3
       when sign(p.home_goals - p.away_goals) = sign(r.home_goals - r.away_goals) then 1
       else 0
     end;

  get diagnostics v_updated = row_count;
  return v_updated;
end;
$$;

-- Función: recalcular TODAS las predicciones con resultado
create or replace function public.recalculate_all_prediction_points()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer := 0;
  v_match_id text;
begin
  for v_match_id in select match_id from public.results order by match_id loop
    v_total := v_total + public.recalculate_prediction_points_for_match(v_match_id);
  end loop;
  return v_total;
end;
$$;

-- Trigger: al cargar/actualizar resultado, recalcular ese partido
create or replace function public.trigger_recalculate_points_on_result()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recalculate_prediction_points_for_match(new.match_id);
  return new;
end;
$$;

drop trigger if exists recalculate_points_on_result on public.results;
create trigger recalculate_points_on_result
  after insert or update of home_goals, away_goals on public.results
  for each row
  execute function public.trigger_recalculate_points_on_result();

-- Reparación inmediata (todas las discrepancias actuales)
select public.recalculate_all_prediction_points() as filas_actualizadas;

-- Verificación boca2000 / a-3
select
  pr.username,
  p.match_id,
  p.home_goals || '-' || p.away_goals as prediccion,
  r.home_goals || '-' || r.away_goals as resultado,
  p.points,
  p.points_updated_at
from public.profiles pr
join public.predictions p on p.user_id = pr.id and p.match_id = 'a-3'
join public.results r on r.match_id = 'a-3'
where pr.username = 'boca2000';

notify pgrst, 'reload schema';
