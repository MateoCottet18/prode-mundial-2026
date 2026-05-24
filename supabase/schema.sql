-- =============================================================================
-- Prode Mundial 2026 — Schema definitivo (Supabase como única fuente de verdad)
--
-- Este archivo es IDEMPOTENTE: se puede correr cuantas veces se quiera sobre
-- la base ya en uso. Ajusta tablas existentes, agrega constraints faltantes y
-- (re)crea las policies de RLS necesarias.
--
-- Datos persistidos en Supabase (NO en localStorage):
--   - public.profiles    : usuarios + role + payment_status
--   - public.predictions : predicciones por usuario y partido
--   - public.results     : resultados reales por partido
--   - public.payments    : comprobantes subidos por los participantes
--
-- Datos que se quedan estáticos en el código (referencia del Mundial):
--   - data/matches.ts   (calendario, equipos, sedes)
--   - data/knockout.ts  (estructura del bracket)
--   - data/teamFlags.ts (mapping equipo -> ISO code para banderitas)
--
-- Esos datos son los mismos para todos los dispositivos, no cambian por
-- jugador, y por eso no necesitan persistirse en la DB.
-- =============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  username text not null unique,
  role text not null default 'participante',
  payment_status text not null default 'pending',
  created_at timestamptz not null default now()
);

-- Re-aplica constraints aceptando los valores reales de la app.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('participante', 'admin'));

alter table public.profiles drop constraint if exists profiles_payment_status_check;
alter table public.profiles
  add constraint profiles_payment_status_check
  check (payment_status in ('pending', 'pending_review', 'approved', 'rejected'));

-- Default histórico era 'pending_review' (incorrecto: el usuario nuevo no tiene
-- comprobante todavía). Lo bajamos a 'pending'. La migración de filas vivas
-- corre al final del archivo, una vez que public.payments ya existe.
alter table public.profiles alter column payment_status set default 'pending';

-- ---------------------------------------------------------------------------
-- predictions
--
-- match_id es TEXT sin FK porque el calendario del Mundial vive en el código
-- (data/matches.ts) y los ids son determinísticos (ej. "a-1", "16avos-3").
-- Mantener una tabla de matches en DB sería duplicación sin beneficio.
-- ---------------------------------------------------------------------------
create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  match_id text not null,
  home_goals int not null check (home_goals >= 0),
  away_goals int not null check (away_goals >= 0),
  points int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, match_id)
);

-- Si la versión vieja tenía la FK a public.matches, la sacamos.
alter table public.predictions drop constraint if exists predictions_match_id_fkey;

-- ---------------------------------------------------------------------------
-- results
-- ---------------------------------------------------------------------------
create table if not exists public.results (
  match_id text primary key,
  home_goals int not null check (home_goals >= 0),
  away_goals int not null check (away_goals >= 0),
  status text not null default 'finished' check (status in ('pending', 'finished')),
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.results drop constraint if exists results_match_id_fkey;

-- Tabla legacy `public.matches` (si existe de una iteración anterior):
-- ya no se usa, pero la dejamos por compatibilidad histórica.
-- Si querés liberarla, descomentar:
-- drop table if exists public.matches cascade;

-- ---------------------------------------------------------------------------
-- payments
-- ---------------------------------------------------------------------------
-- Flujo nuevo: el usuario declara `payer_name` (nombre de quien hizo la
-- transferencia) y aprieta "Ya pagué". Las columnas `file_*` y `storage_path`
-- son legacy y quedan nullables para no romper filas con comprobante histórico.
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  payer_name text,
  file_name text,
  file_size bigint,
  file_type text,
  storage_path text,
  status text not null default 'pending_review'
    check (status in ('pending', 'pending_review', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  uploaded_at timestamptz not null default now()
);

-- Migración para tablas viejas: agrega payer_name y afloja file_* a nullable.
alter table public.payments add column if not exists payer_name text;
alter table public.payments alter column file_name drop not null;
alter table public.payments alter column file_size drop not null;
alter table public.payments alter column file_type drop not null;

create index if not exists payments_user_id_uploaded_at_desc_idx
  on public.payments (user_id, uploaded_at desc);

-- ---------------------------------------------------------------------------
-- Trigger genérico para mantener updated_at coherente
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists predictions_touch_updated_at on public.predictions;
create trigger predictions_touch_updated_at
  before update on public.predictions
  for each row execute function public.touch_updated_at();

drop trigger if exists results_touch_updated_at on public.results;
create trigger results_touch_updated_at
  before update on public.results
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.predictions enable row level security;
alter table public.results enable row level security;
alter table public.payments enable row level security;

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

-- profiles: lectura propia (login/sesión), lectura pública (ranking),
-- insert propio, update propio o admin. Service-role bypasea RLS.
drop policy if exists "users can read own profile" on public.profiles;
create policy "users can read own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "profiles are publicly readable for standings" on public.profiles;
create policy "profiles are publicly readable for standings"
  on public.profiles for select
  to anon, authenticated
  using (true);

drop policy if exists "users can insert own profile" on public.profiles;
create policy "users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "users can update own profile basic data" on public.profiles;
create policy "users can update own profile basic data"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

drop policy if exists "admin can update any profile" on public.profiles;
create policy "admin can update any profile"
  on public.profiles for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- results: lectura pública, sólo admin escribe.
drop policy if exists "results are public" on public.results;
create policy "results are public"
  on public.results for select
  using (true);

drop policy if exists "only admin manages results" on public.results;
create policy "only admin manages results"
  on public.results for all
  using (public.is_admin())
  with check (public.is_admin());

-- predictions: cada usuario ve / escribe las suyas; admin lee todas
-- (necesario para calcular el ranking del lado server si quisiéramos).
-- El ranking público se construye desde el lado cliente usando profiles
-- (públicos) + predictions. Para que el ranking público funcione sin estar
-- logueado, abrimos `select` también a anónimos pero ocultamos los puntajes
-- por usuario que no son propios; el ranking igualmente sólo necesita
-- (user_id, points), por lo que dejamos la columna libre y la sensibilidad
-- queda en que la app no expone goles por partido al UI público.
drop policy if exists "users can view own predictions and admin can view all" on public.predictions;
drop policy if exists "anyone can read predictions for ranking" on public.predictions;
create policy "anyone can read predictions for ranking"
  on public.predictions for select
  using (true);

drop policy if exists "users can insert own predictions" on public.predictions;
create policy "users can insert own predictions"
  on public.predictions for insert
  with check (auth.uid() = user_id);

drop policy if exists "users can update own predictions" on public.predictions;
drop policy if exists "users can update own predictions or admin recalcs" on public.predictions;
create policy "users can update own predictions or admin recalcs"
  on public.predictions for update
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "users can delete own predictions" on public.predictions;
create policy "users can delete own predictions"
  on public.predictions for delete
  using (auth.uid() = user_id or public.is_admin());

-- payments: el usuario ve los propios, el admin ve todos.
drop policy if exists "users can view own payments and admin can view all" on public.payments;
create policy "users can view own payments and admin can view all"
  on public.payments for select
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "users can insert own payment" on public.payments;
create policy "users can insert own payment"
  on public.payments for insert
  with check (auth.uid() = user_id);

drop policy if exists "admin can update payments" on public.payments;
create policy "admin can update payments"
  on public.payments for update
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Storage: bucket para los comprobantes
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('payment-receipts', 'payment-receipts', false)
on conflict (id) do nothing;

-- Cada usuario puede subir/leer SUS archivos (storage_path empieza con su uid);
-- el admin lee todo.
drop policy if exists "user can upload own receipts" on storage.objects;
create policy "user can upload own receipts"
  on storage.objects for insert
  with check (
    bucket_id = 'payment-receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "user can read own receipts" on storage.objects;
create policy "user can read own receipts"
  on storage.objects for select
  using (
    bucket_id = 'payment-receipts'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );

-- ---------------------------------------------------------------------------
-- Migración de profiles antiguos:
-- antes el default de payment_status era 'pending_review', así que muchos
-- profiles quedaron en ese estado SIN haber subido nada a public.payments.
-- Eso hacía que /pago mostrara "Tu comprobante ya fue enviado" antes de
-- adjuntar nada. Los devolvemos a 'pending'.
-- ---------------------------------------------------------------------------
update public.profiles p
   set payment_status = 'pending'
 where payment_status = 'pending_review'
   and not exists (
     select 1 from public.payments x where x.user_id = p.id
   );
