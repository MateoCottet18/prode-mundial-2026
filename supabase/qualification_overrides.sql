-- =============================================================================
-- Prode Mundial 2026 — qualification_overrides
--
-- Tabla para que el admin defina manualmente clasificados a fase eliminatoria
-- cuando los criterios reales de FIFA (fair play, sorteo, desempates raros)
-- no coinciden con el cálculo automático.
--
-- Idempotente: se puede correr varias veces sobre la base ya en uso.
--
-- Convenciones de `slot`:
--   * Posición de grupo: '1A', '2A', '1B', '2B', …, '1L', '2L'  (24 slots)
--   * Mejor tercero:     'BEST_THIRD_1' … 'BEST_THIRD_8'        (8 slots)
--   * Lado de cruce KO:  '<stage>-<index>-<home|away>'
--                        ej: '16avos-1-home', 'octavos-3-away',
--                            'cuartos-2-home', 'semifinal-1-away',
--                            'final-1-home'
--
-- Reglas de resolución en `lib/standings.ts`:
--   1) Si existe override para `<stage>-<index>-<side>`  → ese equipo (manual)
--   2) Si existe override para el slot subyacente (1A, BEST_THIRD_1, …)  → manual
--   3) Si no, cálculo automático (`auto`)
-- =============================================================================

create table if not exists public.qualification_overrides (
  id uuid primary key default gen_random_uuid(),
  stage text not null default '16avos',
  slot text not null unique,
  team_name text not null,
  reason text,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.qualification_overrides drop constraint if exists qualification_overrides_stage_check;
alter table public.qualification_overrides
  add constraint qualification_overrides_stage_check
  check (stage in ('grupos', '16avos', 'octavos', 'cuartos', 'semifinal', 'final'));

-- Mantenemos updated_at coherente (reusa la función que ya define schema.sql).
-- Si schema.sql no fue ejecutado todavía, creamos la función localmente para
-- que este archivo sea autosuficiente.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists qualification_overrides_touch_updated_at on public.qualification_overrides;
create trigger qualification_overrides_touch_updated_at
  before update on public.qualification_overrides
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.qualification_overrides enable row level security;

-- is_admin() ya está creado por schema.sql; lo redefinimos por idempotencia.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_admin() to anon;

drop policy if exists "qualification overrides are public" on public.qualification_overrides;
create policy "qualification overrides are public"
  on public.qualification_overrides for select
  using (true);

drop policy if exists "only admin manages qualification overrides" on public.qualification_overrides;
create policy "only admin manages qualification overrides"
  on public.qualification_overrides for all
  using (public.is_admin())
  with check (public.is_admin());
