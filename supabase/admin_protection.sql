-- =============================================================================
-- Admin protection
-- =============================================================================
-- Idempotent (safe to run multiple times). Does NOT disable RLS, drop foreign
-- keys, or modify existing policies.
--
-- The protected admin is identified by EITHER its email or its username, as
-- stored in `public.app_settings`. The triggers and the bootstrap block below
-- always sync the row to:
--    role           = 'admin'
--    payment_status = 'approved'
--
-- HOW TO USE
--   1. Edit the two `select set_admin_*` calls near the bottom with your real
--      admin identifiers. The values must match the ADMIN_EMAIL / ADMIN_USERNAME
--      env vars in your .env.local.
--   2. Run this whole file in the Supabase SQL editor.
--   3. Make sure the admin user already exists in `auth.users` (the registro
--      page does this for you; otherwise use Authentication > Users).
--   4. The DO block at the end will create or repair public.profiles for that
--      admin in a single shot.
-- =============================================================================

-- 1. Settings table with one source of truth.
create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;
-- No public policies: only service_role can read/write app_settings.

create or replace function public.set_admin_email(p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.app_settings (key, value)
  values ('admin_email', lower(trim(p_email)))
  on conflict (key) do update
    set value = excluded.value,
        updated_at = now();
end;
$$;

create or replace function public.set_admin_username(p_username text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.app_settings (key, value)
  values ('admin_username', lower(trim(p_username)))
  on conflict (key) do update
    set value = excluded.value,
        updated_at = now();
end;
$$;

create or replace function public.get_admin_email()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select value from public.app_settings where key = 'admin_email' limit 1;
$$;

create or replace function public.get_admin_username()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select value from public.app_settings where key = 'admin_username' limit 1;
$$;

-- 2. Trigger: any insert/update that targets the configured admin (by email OR
-- username) is forced to role='admin' and payment_status='approved'.
create or replace function public.enforce_admin_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_email    text := public.get_admin_email();
  v_admin_username text := public.get_admin_username();
  v_is_admin       boolean := false;
begin
  if v_admin_email is not null and v_admin_email <> ''
     and lower(coalesce(new.email, '')) = v_admin_email then
    v_is_admin := true;
  end if;

  if v_admin_username is not null and v_admin_username <> ''
     and lower(coalesce(new.username, '')) = v_admin_username then
    v_is_admin := true;
  end if;

  if v_is_admin then
    new.role := 'admin';
    new.payment_status := 'approved';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_enforce_admin_role on public.profiles;

create trigger profiles_enforce_admin_role
before insert or update of email, username, role, payment_status
on public.profiles
for each row
execute function public.enforce_admin_role();

-- 3. Trigger: prevent deletes of the admin row.
create or replace function public.block_admin_profile_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_email    text := public.get_admin_email();
  v_admin_username text := public.get_admin_username();
begin
  if (v_admin_email is not null and v_admin_email <> ''
      and lower(coalesce(old.email, '')) = v_admin_email)
     or
     (v_admin_username is not null and v_admin_username <> ''
      and lower(coalesce(old.username, '')) = v_admin_username) then
    raise exception 'admin profile (% / %) cannot be deleted', old.email, old.username
      using errcode = '42501';
  end if;
  return old;
end;
$$;

drop trigger if exists profiles_block_admin_delete on public.profiles;

create trigger profiles_block_admin_delete
before delete on public.profiles
for each row
execute function public.block_admin_profile_delete();

-- =============================================================================
-- ONE-TIME SETUP for THIS app: mateocottet
-- =============================================================================

-- Set the admin username (we always have it: mateocottet).
select public.set_admin_username('mateocottet');

-- OPTIONAL: also lock by email. Replace with the admin's real email or
-- comment out this line if you only want username-based protection.
-- select public.set_admin_email('mateo@example.com');

-- Bootstrap / repair the admin profile. Looks up auth.users by email or by
-- existing profile, then ensures the public.profiles row exists and is locked
-- to role='admin' / payment_status='approved'.
do $$
declare
  v_admin_email    text := public.get_admin_email();
  v_admin_username text := public.get_admin_username();
  v_admin_id       uuid;
  v_admin_name     text := 'Mateo Cottet';
  v_resolved_email text;
begin
  -- Try by email first.
  if v_admin_email is not null and v_admin_email <> '' then
    select id into v_admin_id from auth.users where lower(email) = v_admin_email;
  end if;

  -- Then by username via an existing profile -> auth.users link.
  if v_admin_id is null and v_admin_username is not null and v_admin_username <> '' then
    select au.id
      into v_admin_id
      from public.profiles p
      join auth.users au on au.id = p.id
     where lower(p.username) = v_admin_username
     limit 1;
  end if;

  if v_admin_id is null then
    raise notice 'Admin not found. Create the user in Supabase Auth (Authentication > Users) and re-run this DO block.';
    return;
  end if;

  -- Resolve the email from auth.users so the profile row stays consistent.
  select lower(email) into v_resolved_email from auth.users where id = v_admin_id;

  insert into public.profiles (id, name, email, username, role, payment_status)
  values (
    v_admin_id,
    v_admin_name,
    coalesce(v_resolved_email, v_admin_email),
    v_admin_username,
    'admin',
    'approved'
  )
  on conflict (id) do update
    set name           = excluded.name,
        username       = excluded.username,
        email          = excluded.email,
        role           = 'admin',
        payment_status = 'approved';

  raise notice 'Admin profile ensured. id=%, username=%, email=%',
    v_admin_id, v_admin_username, coalesce(v_resolved_email, v_admin_email);
end $$;
