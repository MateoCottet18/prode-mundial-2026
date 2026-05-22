-- =============================================================================
-- Fix RLS: profiles — lectura del propio perfil + ranking público
-- =============================================================================
-- Ejecutar en Supabase SQL Editor (idempotente, seguro re-ejecutar).
--
-- Problema típico: sin policy SELECT con auth.uid() = id, el login autentica
-- pero la lectura de public.profiles tras signInWithPassword cuelga o falla.
-- =============================================================================

alter table public.profiles enable row level security;

-- is_admin() debe leer profiles SIN disparar RLS (evita recursión / timeouts).
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

-- 1) Usuario autenticado lee SU propio profile (login, /perfil, sesión).
drop policy if exists "users can read own profile" on public.profiles;
create policy "users can read own profile"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

-- 2) Ranking / listados públicos (anon + autenticados).
--    Expone filas de participantes para la tabla; no reemplaza la policy (1).
drop policy if exists "profiles are publicly readable for standings" on public.profiles;
create policy "profiles are publicly readable for standings"
  on public.profiles
  for select
  to anon, authenticated
  using (true);

-- Insert / update (sin cambios de intención).
drop policy if exists "users can insert own profile" on public.profiles;
create policy "users can insert own profile"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "users can update own profile basic data" on public.profiles;
create policy "users can update own profile basic data"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

-- Admin puede actualizar cualquier profile (pagos, etc.).
drop policy if exists "admin can update any profile" on public.profiles;
create policy "admin can update any profile"
  on public.profiles
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
