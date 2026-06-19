-- =============================================================================
-- Prode Mundial 2026 — predictions_lock.sql
--
-- Defensa en profundidad: bloquea INSERT/UPDATE/DELETE tardíos en
-- public.predictions aunque el cliente intente bypass (request manual, cache).
--
-- Reglas:
--   - Ventana abierta solo si kickoff_utc existe y now() < kickoff
--   - Cerrado si hay fila en public.results
--   - Sin kickoff_utc → cerrado ("horario no confirmado")
--   - Admin puede actualizar SOLO la columna points (recálculo)
--   - Service role (auth.uid() null) confía en validación server-side previa
--
-- Idempotente: se puede correr varias veces en producción.
-- =============================================================================

create or replace function public.enforce_prediction_window()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match_id text;
  v_kickoff timestamptz;
  v_has_result boolean;
begin
  if tg_op = 'DELETE' then
    v_match_id := old.match_id;
  else
    v_match_id := new.match_id;
  end if;

  -- Saves validados por API con service role (sin JWT en contexto Postgres).
  if auth.uid() is null then
    return coalesce(new, old);
  end if;

  -- Admin: recálculo de puntos (solo cambia points, no goles).
  if tg_op = 'UPDATE' and public.is_admin() then
    if new.home_goals is not distinct from old.home_goals
       and new.away_goals is not distinct from old.away_goals then
      return new;
    end if;
    raise exception 'admin cannot manage participant predictions'
      using errcode = 'P0001';
  end if;

  if public.is_admin() then
    raise exception 'admin cannot manage participant predictions'
      using errcode = 'P0001';
  end if;

  select m.kickoff_utc
    into v_kickoff
    from public.matches m
   where m.id = v_match_id;

  if v_kickoff is null then
    raise exception 'prediction closed: schedule unconfirmed'
      using errcode = 'P0001';
  end if;

  if now() >= v_kickoff then
    raise exception 'prediction closed: match started'
      using errcode = 'P0001';
  end if;

  select exists(
    select 1 from public.results r where r.match_id = v_match_id
  ) into v_has_result;

  if v_has_result then
    raise exception 'prediction closed: result loaded'
      using errcode = 'P0001';
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists enforce_prediction_window_trigger on public.predictions;

create trigger enforce_prediction_window_trigger
  before insert or update or delete on public.predictions
  for each row
  execute function public.enforce_prediction_window();

notify pgrst, 'reload schema';
