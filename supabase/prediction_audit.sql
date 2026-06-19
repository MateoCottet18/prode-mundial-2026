-- =============================================================================
-- Prode Mundial 2026 — prediction_audit.sql
--
-- Auditoría de EDICIONES DE MARCADOR (home_goals / away_goals):
--   updated_at        → último cambio del marcador predicho
--   points_updated_at → último recálculo de points (admin / resultado)
--
-- El audit log SOLO registra cambios de marcador (UPDATE con goles distintos).
-- NO registra: recálculo de points, INSERT inicial, cambios de agregados.
--
-- Edición tardía REAL (desde ahora, vía audit log):
--   - la predicción ya existía antes del kickoff (created_at < kickoff)
--   - después del kickoff cambió home_goals o away_goals
--
-- Idempotente. No modifica points ni goles existentes.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Columna points_updated_at
-- ---------------------------------------------------------------------------
alter table public.predictions
  add column if not exists points_updated_at timestamptz;

update public.predictions
   set points_updated_at = updated_at
 where points_updated_at is null;

alter table public.predictions
  alter column points_updated_at set default now();

alter table public.predictions
  alter column points_updated_at set not null;

comment on column public.predictions.updated_at is
  'Última modificación del marcador predicho (home_goals / away_goals). NO se toca en recálculo de points.';

comment on column public.predictions.points_updated_at is
  'Última modificación de points (recálculo admin o resultado cargado). NO afecta updated_at.';

-- ---------------------------------------------------------------------------
-- 2) Tabla prediction_audit_log (solo cambios de marcador)
-- ---------------------------------------------------------------------------
create table if not exists public.prediction_audit_log (
  id uuid primary key default gen_random_uuid(),
  prediction_id uuid not null references public.predictions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  match_id text not null,
  old_home_goals int not null,
  old_away_goals int not null,
  new_home_goals int not null,
  new_away_goals int not null,
  changed_by uuid references public.profiles(id) on delete set null,
  changed_at timestamptz not null default now(),
  change_source text
);

-- Migración desde versión anterior que tenía changed_points_only / INSERTs
alter table public.prediction_audit_log
  drop column if exists changed_points_only;

create index if not exists prediction_audit_log_prediction_id_idx
  on public.prediction_audit_log (prediction_id);

create index if not exists prediction_audit_log_match_id_changed_at_idx
  on public.prediction_audit_log (match_id, changed_at desc);

drop index if exists prediction_audit_log_late_score_idx;
create index if not exists prediction_audit_log_late_score_edit_idx
  on public.prediction_audit_log (changed_at desc)
  where old_home_goals is not null;

comment on table public.prediction_audit_log is
  'Historial de cambios de marcador predicho (home/away). Una fila = un UPDATE donde cambiaron los goles.';

-- ---------------------------------------------------------------------------
-- 3) Timestamps: updated_at sólo marcador; points_updated_at sólo points
-- ---------------------------------------------------------------------------
create or replace function public.predictions_touch_timestamps()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.updated_at := coalesce(new.updated_at, now());
    new.points_updated_at := coalesce(new.points_updated_at, now());
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.home_goals is distinct from old.home_goals
       or new.away_goals is distinct from old.away_goals then
      new.updated_at := now();
    else
      new.updated_at := old.updated_at;
    end if;

    if new.points is distinct from old.points then
      new.points_updated_at := now();
    else
      new.points_updated_at := old.points_updated_at;
    end if;

    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists predictions_touch_updated_at on public.predictions;

drop trigger if exists predictions_touch_timestamps on public.predictions;
create trigger predictions_touch_timestamps
  before insert or update on public.predictions
  for each row
  execute function public.predictions_touch_timestamps();

-- ---------------------------------------------------------------------------
-- 4) Audit log: SOLO cuando cambian home_goals o away_goals (UPDATE)
-- ---------------------------------------------------------------------------
create or replace function public.log_prediction_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_change_source text;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if new.home_goals is not distinct from old.home_goals
     and new.away_goals is not distinct from old.away_goals then
    return new;
  end if;

  v_change_source := case
    when auth.uid() is null then 'service_role'
    when public.is_admin() then 'admin'
    else 'participant'
  end;

  insert into public.prediction_audit_log (
    prediction_id,
    user_id,
    match_id,
    old_home_goals,
    old_away_goals,
    new_home_goals,
    new_away_goals,
    changed_by,
    change_source
  ) values (
    new.id,
    new.user_id,
    new.match_id,
    old.home_goals,
    old.away_goals,
    new.home_goals,
    new.away_goals,
    auth.uid(),
    v_change_source
  );

  return new;
end;
$$;

drop trigger if exists log_prediction_audit_trigger on public.predictions;
create trigger log_prediction_audit_trigger
  after update on public.predictions
  for each row
  execute function public.log_prediction_audit();

-- ---------------------------------------------------------------------------
-- 5) RLS — audit log: sólo admin lee
-- ---------------------------------------------------------------------------
alter table public.prediction_audit_log enable row level security;

drop policy if exists "admin can read prediction audit log" on public.prediction_audit_log;
create policy "admin can read prediction audit log"
  on public.prediction_audit_log
  for select
  using (public.is_admin());

notify pgrst, 'reload schema';
