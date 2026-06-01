-- =============================================================================
-- Reparación idempotente de RLS en public.predictions
--
-- Ejecutar en Supabase SQL Editor si los saves fallan con 42501 (policy).
-- Requisito: user_id en cada fila = auth.users.id (UUID del perfil).
-- =============================================================================

alter table public.predictions enable row level security;

-- Lectura abierta (ranking / agregados). La app no expone goles ajenos en UI pública.
drop policy if exists "users can view own predictions and admin can view all" on public.predictions;
drop policy if exists "anyone can read predictions for ranking" on public.predictions;
create policy "anyone can read predictions for ranking"
  on public.predictions for select
  using (true);

-- INSERT: sólo el dueño (auth.uid = user_id)
drop policy if exists "users can insert own predictions" on public.predictions;
create policy "users can insert own predictions"
  on public.predictions for insert
  with check (auth.uid() = user_id);

-- UPDATE: dueño o admin (recálculo de points)
drop policy if exists "users can update own predictions" on public.predictions;
drop policy if exists "users can update own predictions or admin recalcs" on public.predictions;
create policy "users can update own predictions or admin recalcs"
  on public.predictions for update
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

-- DELETE: dueño o admin
drop policy if exists "users can delete own predictions" on public.predictions;
create policy "users can delete own predictions"
  on public.predictions for delete
  using (auth.uid() = user_id or public.is_admin());

-- Asegurar constraint de upsert (user_id, match_id)
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.predictions'::regclass
      and contype = 'u'
      and pg_get_constraintdef(oid) like '%user_id%match_id%'
  ) then
    alter table public.predictions
      add constraint predictions_user_id_match_id_key unique (user_id, match_id);
  end if;
end $$;

notify pgrst, 'reload schema';
