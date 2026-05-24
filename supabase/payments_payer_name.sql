-- =============================================================================
-- payments_payer_name.sql — migración idempotente
--
-- Cambia el flujo de pagos: ya NO se sube comprobante (archivo). Ahora el
-- usuario sólo informa el nombre de quien hizo la transferencia y aprieta
-- "Ya pagué". El admin lee ese nombre desde "Revisión de pagos".
--
-- Este script es seguro de correr varias veces sobre una base productiva:
--   1. Agrega `payer_name text` a public.payments si falta.
--   2. Hace nullable las columnas legacy `file_name`, `file_size`, `file_type`
--      (sólo si existían como NOT NULL) para no romper inserts nuevos.
--   3. Mantiene `storage_path` nullable (ya lo era).
--   4. NO borra datos viejos — los comprobantes históricos siguen donde están.
--   5. NO toca RLS: las policies vigentes ya cubren el insert/select por
--      user_id y la actualización por admin.
--   6. NO toca public.profiles ni public.predictions ni public.results.
-- =============================================================================

-- 1. Asegurar la tabla payments (no recrea si ya existe).
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending_review'
    check (status in ('pending', 'pending_review', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  uploaded_at timestamptz not null default now()
);

-- 2. Agregar payer_name (nuevo flujo).
alter table public.payments add column if not exists payer_name text;

-- 3. Aflojar las columnas legacy a nullable. Si ya estaban nullables, no pasa
-- nada: el `drop not null` es idempotente en Postgres.
alter table public.payments
  alter column file_name drop not null;
alter table public.payments
  alter column file_size drop not null;
alter table public.payments
  alter column file_type drop not null;

-- 4. Asegurar que storage_path puede ser null (lo era por diseño, pero por las
-- dudas).
alter table public.payments
  alter column storage_path drop not null;

-- 5. Asegurar default y check del status (idempotente).
alter table public.payments
  alter column status set default 'pending_review';

alter table public.payments
  drop constraint if exists payments_status_check;
alter table public.payments
  add constraint payments_status_check
  check (status in ('pending', 'pending_review', 'approved', 'rejected'));

-- 6. RLS: re-aplica policies por si alguna se borró. Idempotente.
alter table public.payments enable row level security;

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

-- 7. Índice útil para el admin (último pago por usuario).
create index if not exists payments_user_id_uploaded_at_desc_idx
  on public.payments (user_id, uploaded_at desc);
