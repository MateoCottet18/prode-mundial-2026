-- =============================================================================
-- Prode Mundial 2026 — REPARACIÓN FINAL de public.matches (schema legacy)
--
-- Para tablas que YA existen con columnas viejas (ej. date_label NOT NULL, date,
-- time, "group", home, away…) y columnas nuevas (match_date, kickoff_time…).
--
-- NO hace DROP TABLE. NO borra filas.
-- Idempotente: se puede correr varias veces.
--
-- Antes de correr, ejecutá la query de inspección (al final de este archivo o
-- en el mensaje del agente) para ver column_name / is_nullable.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. Funciones auxiliares (por si faltan)
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, anon;

-- ---------------------------------------------------------------------------
-- 1. Tabla mínima si no existiera (no destruye nada si ya existe)
-- ---------------------------------------------------------------------------
create table if not exists public.matches (
  id text primary key
);

-- ---------------------------------------------------------------------------
-- 2. Columnas nuevas (las que usa la app en matchService.ts)
-- ---------------------------------------------------------------------------
alter table public.matches add column if not exists home_team    text;
alter table public.matches add column if not exists away_team    text;
alter table public.matches add column if not exists match_date   text;
alter table public.matches add column if not exists kickoff_time text;
alter table public.matches add column if not exists group_name   text;
alter table public.matches add column if not exists stage        text;
alter table public.matches add column if not exists matchday     smallint;
alter table public.matches add column if not exists venue        text;
alter table public.matches add column if not exists city         text;
alter table public.matches add column if not exists created_at   timestamptz not null default now();
alter table public.matches add column if not exists updated_at   timestamptz not null default now();

-- Columna legacy que pediste conservar
alter table public.matches add column if not exists date_label   text;

-- Otras legacy frecuentes (solo se crean si no existen; no pisan tipos viejos)
alter table public.matches add column if not exists date         text;
alter table public.matches add column if not exists time         text;
alter table public.matches add column if not exists home         text;
alter table public.matches add column if not exists away         text;
alter table public.matches add column if not exists "group"      text;
alter table public.matches add column if not exists stadium      text;
alter table public.matches add column if not exists location     text;

-- ---------------------------------------------------------------------------
-- 3. Legacy → columnas nuevas (rellena match_date, home_team, etc.)
-- ---------------------------------------------------------------------------
do $$
declare
  pairs constant text[][] := array[
    array['date',         'match_date'],
    array['date_label',  'match_date'],
    array['kickoff',      'kickoff_time'],
    array['kickoff_at',   'kickoff_time'],
    array['start_time',   'kickoff_time'],
    array['"time"',       'kickoff_time'],
    array['"group"',      'group_name'],
    array['group_id',     'group_name'],
    array['phase',        'stage'],
    array['home',         'home_team'],
    array['home_country', 'home_team'],
    array['away',         'away_team'],
    array['away_country', 'away_team'],
    array['stadium',      'venue'],
    array['venue_name',   'venue'],
    array['location',     'city']
  ];
  pair text[];
  legacy_col text;
  new_col text;
  unquoted text;
begin
  foreach pair slice 1 in array pairs loop
    legacy_col := pair[1];
    new_col := pair[2];
    unquoted := trim(both '"' from legacy_col);
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'matches' and column_name = unquoted
    ) then
      execute format(
        'update public.matches set %I = coalesce(%I, %s::text) where %I is null',
        new_col, new_col, legacy_col, new_col
      );
    end if;
  end loop;
end $$;

-- matchday desde round (si existe)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'matches' and column_name = 'round'
  ) then
    execute $q$
      update public.matches
         set matchday = nullif(round::text, '')::smallint
       where matchday is null and round::text ~ '^[0-9]+$'
    $q$;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 4. Columnas nuevas → legacy (para satisfacer NOT NULL: date_label, date, time…)
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='matches' and column_name='date_label') then
    execute $q$
      update public.matches
         set date_label = coalesce(nullif(trim(date_label), ''), match_date, date, 'A definir')
       where date_label is null or trim(date_label) = ''
    $q$;
  end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='matches' and column_name='date') then
    execute $q$
      update public.matches
         set date = coalesce(nullif(trim(date), ''), match_date, date_label, 'A definir')
       where date is null or trim(date) = ''
    $q$;
  end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='matches' and column_name='time') then
    execute $q$
      update public.matches
         set time = coalesce(nullif(trim(time), ''), kickoff_time, 'A definir')
       where time is null or trim(time) = ''
    $q$;
  end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='matches' and column_name='home') then
    execute $q$
      update public.matches set home = coalesce(nullif(trim(home), ''), home_team, 'TBD')
       where home is null or trim(home) = ''
    $q$;
  end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='matches' and column_name='away') then
    execute $q$
      update public.matches set away = coalesce(nullif(trim(away), ''), away_team, 'TBD')
       where away is null or trim(away) = ''
    $q$;
  end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='matches' and column_name='group') then
    execute $q$
      update public.matches set "group" = coalesce(nullif(trim("group"), ''), group_name, stage, 'grupos')
       where "group" is null or trim("group") = ''
    $q$;
  end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='matches' and column_name='stadium') then
    execute $q$
      update public.matches set stadium = coalesce(nullif(trim(stadium), ''), venue, '')
       where stadium is null
    $q$;
  end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='matches' and column_name='location') then
    execute $q$
      update public.matches set location = coalesce(nullif(trim(location), ''), city, '')
       where location is null
    $q$;
  end if;
end $$;

-- Defaults en columnas NOT NULL sin default (evita 23502 en filas futuras sueltas)
do $$
declare r record;
begin
  for r in
    select column_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'matches'
      and is_nullable = 'NO'
      and column_default is null
      and column_name not in ('id', 'created_at', 'updated_at')
  loop
  begin
    execute format(
      'alter table public.matches alter column %I set default %L',
      r.column_name,
      case r.column_name
        when 'matchday' then '1'
        when 'stage' then 'grupos'
        else 'A definir'
      end
    );
  exception when others then
    raise notice 'no se pudo setear default en %: %', r.column_name, sqlerrm;
  end;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 5. Trigger + RLS
-- ---------------------------------------------------------------------------
drop trigger if exists matches_touch_updated_at on public.matches;
create trigger matches_touch_updated_at
  before update on public.matches
  for each row execute function public.touch_updated_at();

alter table public.matches enable row level security;

drop policy if exists "matches are public" on public.matches;
create policy "matches are public"
  on public.matches for select using (true);

drop policy if exists "only admin manages matches" on public.matches;
create policy "only admin manages matches"
  on public.matches for all
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 6. Seed / upsert — incluye date_label (= match_date en cada fila)
--    Si tu tabla tiene MÁS columnas NOT NULL no listadas acá, el paso 4 y los
--    defaults del paso anterior deberían cubrirlas; si no, mirá los NOTICE del 8.
-- ---------------------------------------------------------------------------
insert into public.matches (
  id,
  home_team,
  away_team,
  match_date,
  kickoff_time,
  group_name,
  stage,
  matchday,
  venue,
  city,
  date_label
)
values
  ('a-1', 'México',                'Sudáfrica',              '11 jun 2026', '15:00 EDT', 'Grupo A', 'grupos', 1, 'Estadio Azteca',                  'Ciudad de México', '11 jun 2026'),
  ('a-2', 'Corea del Sur',         'Chequia',                '11 jun 2026', '21:00 EDT', 'Grupo A', 'grupos', 1, 'Estadio Akron',                   'Guadalajara',      '11 jun 2026'),
  ('a-3', 'Chequia',               'Sudáfrica',              '18 jun 2026', '12:00 EDT', 'Grupo A', 'grupos', 2, 'Mercedes-Benz Stadium',           'Atlanta',          '18 jun 2026'),
  ('a-4', 'México',                'Corea del Sur',          '18 jun 2026', '21:00 EDT', 'Grupo A', 'grupos', 2, 'Estadio Akron',                   'Guadalajara',      '18 jun 2026'),
  ('a-5', 'Chequia',               'México',                 '24 jun 2026', '21:00 EDT', 'Grupo A', 'grupos', 3, 'Estadio Azteca',                  'Ciudad de México', '24 jun 2026'),
  ('a-6', 'Sudáfrica',             'Corea del Sur',          '24 jun 2026', '21:00 EDT', 'Grupo A', 'grupos', 3, 'Estadio BBVA',                    'Monterrey',        '24 jun 2026'),
  ('b-1', 'Canadá',                'Bosnia y Herzegovina',   '12 jun 2026', '15:00 EDT', 'Grupo B', 'grupos', 1, 'BMO Field',                       'Toronto',          '12 jun 2026'),
  ('b-2', 'Qatar',                 'Suiza',                  '13 jun 2026', '15:00 EDT', 'Grupo B', 'grupos', 1, 'Levi''s Stadium',                 'San Francisco Bay Area', '13 jun 2026'),
  ('b-3', 'Suiza',                 'Bosnia y Herzegovina',   '18 jun 2026', '15:00 EDT', 'Grupo B', 'grupos', 2, 'SoFi Stadium',                    'Los Angeles',      '18 jun 2026'),
  ('b-4', 'Canadá',                'Qatar',                  '18 jun 2026', '21:00 EDT', 'Grupo B', 'grupos', 2, 'BC Place',                        'Vancouver',        '18 jun 2026'),
  ('b-5', 'Suiza',                 'Canadá',                 '24 jun 2026', '21:00 EDT', 'Grupo B', 'grupos', 3, 'BC Place',                        'Vancouver',        '24 jun 2026'),
  ('b-6', 'Bosnia y Herzegovina',  'Qatar',                  '24 jun 2026', '15:00 EDT', 'Grupo B', 'grupos', 3, 'Lumen Field',                     'Seattle',          '24 jun 2026'),
  ('c-1', 'Brasil',                'Marruecos',              '13 jun 2026', '18:00 EDT', 'Grupo C', 'grupos', 1, 'MetLife Stadium',                 'New York/New Jersey', '13 jun 2026'),
  ('c-2', 'Haití',                 'Escocia',                '13 jun 2026', '21:00 EDT', 'Grupo C', 'grupos', 1, 'Gillette Stadium',                'Boston',           '13 jun 2026'),
  ('c-3', 'Escocia',               'Marruecos',              '19 jun 2026', '18:00 EDT', 'Grupo C', 'grupos', 2, 'Gillette Stadium',                'Boston',           '19 jun 2026'),
  ('c-4', 'Brasil',                'Haití',                  '19 jun 2026', '21:00 EDT', 'Grupo C', 'grupos', 2, 'Lincoln Financial Field',         'Philadelphia',     '19 jun 2026'),
  ('c-5', 'Escocia',               'Brasil',                 '24 jun 2026', '18:00 EDT', 'Grupo C', 'grupos', 3, 'Hard Rock Stadium',               'Miami',            '24 jun 2026'),
  ('c-6', 'Marruecos',             'Haití',                  '24 jun 2026', '18:00 EDT', 'Grupo C', 'grupos', 3, 'Mercedes-Benz Stadium',           'Atlanta',          '24 jun 2026'),
  ('d-1', 'Estados Unidos',        'Paraguay',               '12 jun 2026', '21:00 EDT', 'Grupo D', 'grupos', 1, 'SoFi Stadium',                    'Los Angeles',      '12 jun 2026'),
  ('d-2', 'Australia',             'Turquía',                '13 jun 2026', '00:00 EDT', 'Grupo D', 'grupos', 1, 'BC Place',                        'Vancouver',        '13 jun 2026'),
  ('d-3', 'Estados Unidos',        'Australia',              '19 jun 2026', '15:00 EDT', 'Grupo D', 'grupos', 2, 'Lumen Field',                     'Seattle',          '19 jun 2026'),
  ('d-4', 'Turquía',               'Paraguay',               '19 jun 2026', '21:00 EDT', 'Grupo D', 'grupos', 2, 'Levi''s Stadium',                 'San Francisco Bay Area', '19 jun 2026'),
  ('d-5', 'Turquía',               'Estados Unidos',         '25 jun 2026', '22:00 EDT', 'Grupo D', 'grupos', 3, 'SoFi Stadium',                    'Los Angeles',      '25 jun 2026'),
  ('d-6', 'Paraguay',              'Australia',              '25 jun 2026', '22:00 EDT', 'Grupo D', 'grupos', 3, 'Levi''s Stadium',                 'San Francisco Bay Area', '25 jun 2026'),
  ('e-1', 'Alemania',              'Curazao',                '14 jun 2026', '13:00 EDT', 'Grupo E', 'grupos', 1, 'NRG Stadium',                     'Houston',          '14 jun 2026'),
  ('e-2', 'Costa de Marfil',       'Ecuador',                '14 jun 2026', '19:00 EDT', 'Grupo E', 'grupos', 1, 'Lincoln Financial Field',         'Philadelphia',     '14 jun 2026'),
  ('e-3', 'Alemania',              'Costa de Marfil',        '20 jun 2026', '16:00 EDT', 'Grupo E', 'grupos', 2, 'BMO Field',                       'Toronto',          '20 jun 2026'),
  ('e-4', 'Ecuador',               'Curazao',                '20 jun 2026', '20:00 EDT', 'Grupo E', 'grupos', 2, 'GEHA Field at Arrowhead Stadium', 'Kansas City',      '20 jun 2026'),
  ('e-5', 'Ecuador',               'Alemania',               '25 jun 2026', '16:00 EDT', 'Grupo E', 'grupos', 3, 'MetLife Stadium',                 'New York/New Jersey', '25 jun 2026'),
  ('e-6', 'Curazao',               'Costa de Marfil',        '25 jun 2026', '16:00 EDT', 'Grupo E', 'grupos', 3, 'Lincoln Financial Field',         'Philadelphia',     '25 jun 2026'),
  ('f-1', 'Países Bajos',          'Japón',                  '14 jun 2026', '16:00 EDT', 'Grupo F', 'grupos', 1, 'AT&T Stadium',                    'Dallas',           '14 jun 2026'),
  ('f-2', 'Suecia',                'Túnez',                  '14 jun 2026', '21:00 EDT', 'Grupo F', 'grupos', 1, 'Estadio BBVA',                    'Monterrey',        '14 jun 2026'),
  ('f-3', 'Países Bajos',          'Suecia',                 '20 jun 2026', '13:00 EDT', 'Grupo F', 'grupos', 2, 'NRG Stadium',                     'Houston',          '20 jun 2026'),
  ('f-4', 'Túnez',                 'Japón',                  '21 jun 2026', '00:00 EDT', 'Grupo F', 'grupos', 2, 'Estadio BBVA',                    'Monterrey',        '21 jun 2026'),
  ('f-5', 'Japón',                 'Suecia',                 '25 jun 2026', '19:00 EDT', 'Grupo F', 'grupos', 3, 'AT&T Stadium',                    'Dallas',           '25 jun 2026'),
  ('f-6', 'Túnez',                 'Países Bajos',           '25 jun 2026', '19:00 EDT', 'Grupo F', 'grupos', 3, 'GEHA Field at Arrowhead Stadium', 'Kansas City',      '25 jun 2026'),
  ('g-1', 'Irán',                  'Nueva Zelanda',          '15 jun 2026', '21:00 EDT', 'Grupo G', 'grupos', 1, 'SoFi Stadium',                    'Los Angeles',      '15 jun 2026'),
  ('g-2', 'Bélgica',               'Egipto',                 '15 jun 2026', '15:00 EDT', 'Grupo G', 'grupos', 1, 'Lumen Field',                     'Seattle',          '15 jun 2026'),
  ('g-3', 'Bélgica',               'Irán',                   '21 jun 2026', '15:00 EDT', 'Grupo G', 'grupos', 2, 'SoFi Stadium',                    'Los Angeles',      '21 jun 2026'),
  ('g-4', 'Nueva Zelanda',         'Egipto',                 '21 jun 2026', '21:00 EDT', 'Grupo G', 'grupos', 2, 'BC Place',                        'Vancouver',        '21 jun 2026'),
  ('g-5', 'Egipto',                'Irán',                   '26 jun 2026', '23:00 EDT', 'Grupo G', 'grupos', 3, 'Lumen Field',                     'Seattle',          '26 jun 2026'),
  ('g-6', 'Nueva Zelanda',         'Bélgica',                '26 jun 2026', '23:00 EDT', 'Grupo G', 'grupos', 3, 'BC Place',                        'Vancouver',        '26 jun 2026'),
  ('h-1', 'España',                'Cabo Verde',             '15 jun 2026', '12:00 EDT', 'Grupo H', 'grupos', 1, 'Mercedes-Benz Stadium',           'Atlanta',          '15 jun 2026'),
  ('h-2', 'Arabia Saudita',        'Uruguay',                '15 jun 2026', '18:00 EDT', 'Grupo H', 'grupos', 1, 'Hard Rock Stadium',               'Miami',            '15 jun 2026'),
  ('h-3', 'España',                'Arabia Saudita',         '21 jun 2026', '12:00 EDT', 'Grupo H', 'grupos', 2, 'Mercedes-Benz Stadium',           'Atlanta',          '21 jun 2026'),
  ('h-4', 'Uruguay',               'Cabo Verde',             '21 jun 2026', '18:00 EDT', 'Grupo H', 'grupos', 2, 'Hard Rock Stadium',               'Miami',            '21 jun 2026'),
  ('h-5', 'Cabo Verde',            'Arabia Saudita',         '26 jun 2026', '20:00 EDT', 'Grupo H', 'grupos', 3, 'NRG Stadium',                     'Houston',          '26 jun 2026'),
  ('h-6', 'Uruguay',               'España',                 '26 jun 2026', '20:00 EDT', 'Grupo H', 'grupos', 3, 'Estadio Akron',                   'Guadalajara',      '26 jun 2026'),
  ('i-1', 'Francia',               'Senegal',                '16 jun 2026', '15:00 EDT', 'Grupo I', 'grupos', 1, 'MetLife Stadium',                 'New York/New Jersey', '16 jun 2026'),
  ('i-2', 'Irak',                  'Noruega',                '16 jun 2026', '18:00 EDT', 'Grupo I', 'grupos', 1, 'Gillette Stadium',                'Boston',           '16 jun 2026'),
  ('i-3', 'Francia',               'Irak',                   '22 jun 2026', '17:00 EDT', 'Grupo I', 'grupos', 2, 'Lincoln Financial Field',         'Philadelphia',     '22 jun 2026'),
  ('i-4', 'Noruega',               'Senegal',                '22 jun 2026', '20:00 EDT', 'Grupo I', 'grupos', 2, 'MetLife Stadium',                 'New York/New Jersey', '22 jun 2026'),
  ('i-5', 'Noruega',               'Francia',                '26 jun 2026', '15:00 EDT', 'Grupo I', 'grupos', 3, 'Gillette Stadium',                'Boston',           '26 jun 2026'),
  ('i-6', 'Senegal',               'Irak',                   '26 jun 2026', '15:00 EDT', 'Grupo I', 'grupos', 3, 'BMO Field',                       'Toronto',          '26 jun 2026'),
  ('j-1', 'Argentina',             'Argelia',                '16 jun 2026', '21:00 EDT', 'Grupo J', 'grupos', 1, 'GEHA Field at Arrowhead Stadium', 'Kansas City',      '16 jun 2026'),
  ('j-2', 'Austria',               'Jordania',               '17 jun 2026', '00:00 EDT', 'Grupo J', 'grupos', 1, 'Levi''s Stadium',                 'San Francisco Bay Area', '17 jun 2026'),
  ('j-3', 'Argentina',             'Austria',                '22 jun 2026', '13:00 EDT', 'Grupo J', 'grupos', 2, 'AT&T Stadium',                    'Dallas',           '22 jun 2026'),
  ('j-4', 'Jordania',              'Argelia',                '22 jun 2026', '23:00 EDT', 'Grupo J', 'grupos', 2, 'Levi''s Stadium',                 'San Francisco Bay Area', '22 jun 2026'),
  ('j-5', 'Argelia',               'Austria',                '27 jun 2026', '22:00 EDT', 'Grupo J', 'grupos', 3, 'GEHA Field at Arrowhead Stadium', 'Kansas City',      '27 jun 2026'),
  ('j-6', 'Jordania',              'Argentina',              '27 jun 2026', '22:00 EDT', 'Grupo J', 'grupos', 3, 'AT&T Stadium',                    'Dallas',           '27 jun 2026'),
  ('k-1', 'Portugal',              'RD Congo',               '17 jun 2026', '13:00 EDT', 'Grupo K', 'grupos', 1, 'NRG Stadium',                     'Houston',          '17 jun 2026'),
  ('k-2', 'Uzbekistán',            'Colombia',               '17 jun 2026', '22:00 EDT', 'Grupo K', 'grupos', 1, 'Estadio Azteca',                  'Ciudad de México', '17 jun 2026'),
  ('k-3', 'Portugal',              'Uzbekistán',             '23 jun 2026', '13:00 EDT', 'Grupo K', 'grupos', 2, 'NRG Stadium',                     'Houston',          '23 jun 2026'),
  ('k-4', 'Colombia',              'RD Congo',               '23 jun 2026', '22:00 EDT', 'Grupo K', 'grupos', 2, 'Estadio Akron',                   'Guadalajara',      '23 jun 2026'),
  ('k-5', 'Colombia',              'Portugal',               '27 jun 2026', '19:00 EDT', 'Grupo K', 'grupos', 3, 'Hard Rock Stadium',               'Miami',            '27 jun 2026'),
  ('k-6', 'RD Congo',              'Uzbekistán',             '27 jun 2026', '19:00 EDT', 'Grupo K', 'grupos', 3, 'Mercedes-Benz Stadium',           'Atlanta',          '27 jun 2026'),
  ('l-1', 'Inglaterra',            'Croacia',                '17 jun 2026', '16:00 EDT', 'Grupo L', 'grupos', 1, 'AT&T Stadium',                    'Dallas',           '17 jun 2026'),
  ('l-2', 'Ghana',                 'Panamá',                 '17 jun 2026', '19:00 EDT', 'Grupo L', 'grupos', 1, 'BMO Field',                       'Toronto',          '17 jun 2026'),
  ('l-3', 'Inglaterra',            'Ghana',                  '23 jun 2026', '16:00 EDT', 'Grupo L', 'grupos', 2, 'Gillette Stadium',                'Boston',           '23 jun 2026'),
  ('l-4', 'Panamá',                'Croacia',                '23 jun 2026', '19:00 EDT', 'Grupo L', 'grupos', 2, 'BMO Field',                       'Toronto',          '23 jun 2026'),
  ('l-5', 'Panamá',                'Inglaterra',             '27 jun 2026', '17:00 EDT', 'Grupo L', 'grupos', 3, 'MetLife Stadium',                 'New York/New Jersey', '27 jun 2026'),
  ('l-6', 'Croacia',               'Ghana',                  '27 jun 2026', '17:00 EDT', 'Grupo L', 'grupos', 3, 'Lincoln Financial Field',         'Philadelphia',     '27 jun 2026')
on conflict (id) do update set
  home_team    = excluded.home_team,
  away_team    = excluded.away_team,
  match_date   = excluded.match_date,
  kickoff_time = excluded.kickoff_time,
  group_name   = excluded.group_name,
  stage        = excluded.stage,
  matchday     = excluded.matchday,
  venue        = excluded.venue,
  city         = excluded.city,
  date_label   = excluded.date_label,
  updated_at   = now();

-- ---------------------------------------------------------------------------
-- 7. Post-upsert: volcar nuevas columnas → legacy (date, time, home, away, group…)
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='matches' and column_name='date_label') then
    execute 'update public.matches set date_label = match_date where date_label is distinct from match_date or date_label is null';
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='matches' and column_name='date') then
    execute 'update public.matches set date = match_date where date is distinct from match_date or date is null';
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='matches' and column_name='time') then
    execute 'update public.matches set time = kickoff_time where time is distinct from kickoff_time or time is null';
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='matches' and column_name='home') then
    execute 'update public.matches set home = home_team where home is distinct from home_team or home is null';
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='matches' and column_name='away') then
    execute 'update public.matches set away = away_team where away is distinct from away_team or away is null';
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='matches' and column_name='group') then
    execute 'update public.matches set "group" = group_name where "group" is distinct from group_name or "group" is null';
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='matches' and column_name='stadium') then
    execute 'update public.matches set stadium = venue where stadium is distinct from venue';
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='matches' and column_name='location') then
    execute 'update public.matches set location = city where location is distinct from city';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 8. Diagnóstico
-- ---------------------------------------------------------------------------
do $$
declare n int;
begin
  select count(*) into n from public.matches where stage = 'grupos' and group_name like 'Grupo %';
  raise notice 'Partidos de grupos en public.matches: % (esperado 72)', n;
end $$;

do $$
declare rec record;
begin
  for rec in
    select column_name
    from information_schema.columns
    where table_schema = 'public' and table_name = 'matches'
      and column_name not in (
        'id','home_team','away_team','match_date','kickoff_time','group_name',
        'stage','matchday','venue','city','date_label','date','time','home','away',
        'group','stadium','location','created_at','updated_at','round'
      )
    order by 1
  loop
    raise notice 'Columna extra en matches (revisar): %', rec.column_name;
  end loop;
end $$;
