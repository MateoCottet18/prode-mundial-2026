-- =============================================================================
-- Prode Mundial 2026 — REPARACIÓN de public.matches
--
-- Este script es para el caso en que `public.matches` YA existe pero con un
-- schema viejo (faltan columnas como match_date, kickoff_time, group_name…).
-- A diferencia de `supabase/matches.sql`, NUNCA hace `drop table` y NUNCA
-- borra filas. Sólo:
--
--   1. Agrega columnas faltantes (`add column if not exists`).
--   2. Migra datos desde columnas legacy comunes hacia las nuevas.
--   3. Upsertea las 72 filas del calendario de fase de grupos.
--   4. Aplica check constraints null-tolerantes (no fuerza filas legacy).
--   5. Activa RLS con policies de lectura pública / escritura sólo admin.
--   6. Lista en `RAISE NOTICE` cualquier columna sobrante que no se haya
--      migrado, para que la revises a mano.
--
-- Idempotente: se puede correr cuantas veces quieras sobre la misma DB.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. Funciones auxiliares (idempotentes; ya están en supabase/schema.sql,
--    pero las re-creamos por si este script se corre en una DB cruda).
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

-- ---------------------------------------------------------------------------
-- 1. Asegurar la tabla. Si NO existía, la creamos mínima; si existía, no la
--    tocamos. Las columnas se agregan en el paso 2.
-- ---------------------------------------------------------------------------
create table if not exists public.matches (
  id text primary key
);

-- ---------------------------------------------------------------------------
-- 2. Agregar columnas faltantes (todas nullable por ahora; los NOT NULL los
--    omitimos a propósito para no romper filas legacy con datos parciales).
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

-- ---------------------------------------------------------------------------
-- 3. Migración de columnas legacy → nuevas.
--
-- Usamos `EXECUTE` con SQL dinámico para evitar errores de parseo si la
-- columna legacy no existe. Cada bloque sólo corre su UPDATE si encuentra
-- la columna fuente en information_schema.
--
-- Cubrimos los nombres legacy más probables. Si tu tabla tenía OTRO nombre,
-- después del paso 7 vas a ver un RAISE NOTICE con esa columna y la podés
-- migrar a mano con un UPDATE simple.
-- ---------------------------------------------------------------------------
do $$
declare
  legacy_to_new constant text[][] := array[
    -- [columna_legacy, columna_nueva]
    array['date',         'match_date'],
    array['kickoff',      'kickoff_time'],
    array['kickoff_at',   'kickoff_time'],
    array['start_time',   'kickoff_time'],
    array['"time"',       'kickoff_time'],   -- "time" es palabra reservada
    array['"group"',      'group_name'],     -- "group" es palabra reservada
    array['group_id',     'group_name'],
    array['phase',        'stage'],
    array['round_type',   'stage'],
    array['round',        'matchday'],
    array['matchweek',    'matchday'],
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
  unquoted_legacy text;
begin
  foreach pair slice 1 in array legacy_to_new loop
    legacy_col := pair[1];
    new_col    := pair[2];
    -- Para chequear existencia en information_schema necesitamos el nombre
    -- sin comillas. Los identifiers reservados los pasamos quoted en `pair`,
    -- así que sacamos las comillas para el lookup.
    unquoted_legacy := trim(both '"' from legacy_col);

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name   = 'matches'
        and column_name  = unquoted_legacy
    ) then
      raise notice 'migrando legacy column % -> %', unquoted_legacy, new_col;
      execute format(
        'update public.matches set %I = coalesce(%I, %s::text) where %I is null',
        new_col, new_col, legacy_col, new_col
      );
    end if;
  end loop;
end $$;

-- Caso especial: matchday es smallint, no text. Si vino de "round" (text/int),
-- intentamos castearlo a smallint. Si la columna ya estaba en otro tipo y
-- no castea, esta sentencia es no-op porque ya quedó migrada como text en el
-- paso anterior y matchday es smallint (UPDATE...::text falló silently para
-- smallint). Cubrimos los casos sanos:
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'matches' and column_name = 'round'
  ) then
    -- Si "round" era integer/smallint/text con dígitos, lo convertimos.
    -- Saltamos filas donde no se puede castear (regex de dígitos).
    execute $sql$
      update public.matches
         set matchday = nullif(round::text, '')::smallint
       where matchday is null
         and round::text ~ '^[0-9]+$'
    $sql$;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 4. Trigger updated_at (idempotente).
-- ---------------------------------------------------------------------------
drop trigger if exists matches_touch_updated_at on public.matches;
create trigger matches_touch_updated_at
  before update on public.matches
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 5. RLS: lectura pública, escritura sólo admin.
-- ---------------------------------------------------------------------------
alter table public.matches enable row level security;

drop policy if exists "matches are public" on public.matches;
create policy "matches are public"
  on public.matches for select
  using (true);

drop policy if exists "only admin manages matches" on public.matches;
create policy "only admin manages matches"
  on public.matches for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 6. Seed/upsert de los 72 partidos de fase de grupos.
--
-- ON CONFLICT (id) DO UPDATE: si el id ya existía, refrescamos los datos.
-- No borra filas con id distinto a las del seed (las dejamos intactas).
-- ---------------------------------------------------------------------------
insert into public.matches
  (id, home_team, away_team, match_date, kickoff_time, group_name, stage, matchday, venue, city)
values
  ('a-1', 'México',                'Sudáfrica',              '11 jun 2026', '15:00 EDT', 'Grupo A', 'grupos', 1, 'Estadio Azteca',                  'Ciudad de México'),
  ('a-2', 'Corea del Sur',         'Chequia',                '11 jun 2026', '21:00 EDT', 'Grupo A', 'grupos', 1, 'Estadio Akron',                   'Guadalajara'),
  ('a-3', 'Chequia',               'Sudáfrica',              '18 jun 2026', '12:00 EDT', 'Grupo A', 'grupos', 2, 'Mercedes-Benz Stadium',           'Atlanta'),
  ('a-4', 'México',                'Corea del Sur',          '18 jun 2026', '21:00 EDT', 'Grupo A', 'grupos', 2, 'Estadio Akron',                   'Guadalajara'),
  ('a-5', 'Chequia',               'México',                 '24 jun 2026', '21:00 EDT', 'Grupo A', 'grupos', 3, 'Estadio Azteca',                  'Ciudad de México'),
  ('a-6', 'Sudáfrica',             'Corea del Sur',          '24 jun 2026', '21:00 EDT', 'Grupo A', 'grupos', 3, 'Estadio BBVA',                    'Monterrey'),
  ('b-1', 'Canadá',                'Bosnia y Herzegovina',   '12 jun 2026', '15:00 EDT', 'Grupo B', 'grupos', 1, 'BMO Field',                       'Toronto'),
  ('b-2', 'Qatar',                 'Suiza',                  '13 jun 2026', '15:00 EDT', 'Grupo B', 'grupos', 1, 'Levi''s Stadium',                 'San Francisco Bay Area'),
  ('b-3', 'Suiza',                 'Bosnia y Herzegovina',   '18 jun 2026', '15:00 EDT', 'Grupo B', 'grupos', 2, 'SoFi Stadium',                    'Los Angeles'),
  ('b-4', 'Canadá',                'Qatar',                  '18 jun 2026', '21:00 EDT', 'Grupo B', 'grupos', 2, 'BC Place',                        'Vancouver'),
  ('b-5', 'Suiza',                 'Canadá',                 '24 jun 2026', '21:00 EDT', 'Grupo B', 'grupos', 3, 'BC Place',                        'Vancouver'),
  ('b-6', 'Bosnia y Herzegovina',  'Qatar',                  '24 jun 2026', '15:00 EDT', 'Grupo B', 'grupos', 3, 'Lumen Field',                     'Seattle'),
  ('c-1', 'Brasil',                'Marruecos',              '13 jun 2026', '18:00 EDT', 'Grupo C', 'grupos', 1, 'MetLife Stadium',                 'New York/New Jersey'),
  ('c-2', 'Haití',                 'Escocia',                '13 jun 2026', '21:00 EDT', 'Grupo C', 'grupos', 1, 'Gillette Stadium',                'Boston'),
  ('c-3', 'Escocia',               'Marruecos',              '19 jun 2026', '18:00 EDT', 'Grupo C', 'grupos', 2, 'Gillette Stadium',                'Boston'),
  ('c-4', 'Brasil',                'Haití',                  '19 jun 2026', '21:00 EDT', 'Grupo C', 'grupos', 2, 'Lincoln Financial Field',         'Philadelphia'),
  ('c-5', 'Escocia',               'Brasil',                 '24 jun 2026', '18:00 EDT', 'Grupo C', 'grupos', 3, 'Hard Rock Stadium',               'Miami'),
  ('c-6', 'Marruecos',             'Haití',                  '24 jun 2026', '18:00 EDT', 'Grupo C', 'grupos', 3, 'Mercedes-Benz Stadium',           'Atlanta'),
  ('d-1', 'Estados Unidos',        'Paraguay',               '12 jun 2026', '21:00 EDT', 'Grupo D', 'grupos', 1, 'SoFi Stadium',                    'Los Angeles'),
  ('d-2', 'Australia',             'Turquía',                '13 jun 2026', '00:00 EDT', 'Grupo D', 'grupos', 1, 'BC Place',                        'Vancouver'),
  ('d-3', 'Estados Unidos',        'Australia',              '19 jun 2026', '15:00 EDT', 'Grupo D', 'grupos', 2, 'Lumen Field',                     'Seattle'),
  ('d-4', 'Turquía',               'Paraguay',               '19 jun 2026', '21:00 EDT', 'Grupo D', 'grupos', 2, 'Levi''s Stadium',                 'San Francisco Bay Area'),
  ('d-5', 'Turquía',               'Estados Unidos',         '25 jun 2026', '22:00 EDT', 'Grupo D', 'grupos', 3, 'SoFi Stadium',                    'Los Angeles'),
  ('d-6', 'Paraguay',              'Australia',              '25 jun 2026', '22:00 EDT', 'Grupo D', 'grupos', 3, 'Levi''s Stadium',                 'San Francisco Bay Area'),
  ('e-1', 'Alemania',              'Curazao',                '14 jun 2026', '13:00 EDT', 'Grupo E', 'grupos', 1, 'NRG Stadium',                     'Houston'),
  ('e-2', 'Costa de Marfil',       'Ecuador',                '14 jun 2026', '19:00 EDT', 'Grupo E', 'grupos', 1, 'Lincoln Financial Field',         'Philadelphia'),
  ('e-3', 'Alemania',              'Costa de Marfil',        '20 jun 2026', '16:00 EDT', 'Grupo E', 'grupos', 2, 'BMO Field',                       'Toronto'),
  ('e-4', 'Ecuador',               'Curazao',                '20 jun 2026', '20:00 EDT', 'Grupo E', 'grupos', 2, 'GEHA Field at Arrowhead Stadium', 'Kansas City'),
  ('e-5', 'Ecuador',               'Alemania',               '25 jun 2026', '16:00 EDT', 'Grupo E', 'grupos', 3, 'MetLife Stadium',                 'New York/New Jersey'),
  ('e-6', 'Curazao',               'Costa de Marfil',        '25 jun 2026', '16:00 EDT', 'Grupo E', 'grupos', 3, 'Lincoln Financial Field',         'Philadelphia'),
  ('f-1', 'Países Bajos',          'Japón',                  '14 jun 2026', '16:00 EDT', 'Grupo F', 'grupos', 1, 'AT&T Stadium',                    'Dallas'),
  ('f-2', 'Suecia',                'Túnez',                  '14 jun 2026', '21:00 EDT', 'Grupo F', 'grupos', 1, 'Estadio BBVA',                    'Monterrey'),
  ('f-3', 'Países Bajos',          'Suecia',                 '20 jun 2026', '13:00 EDT', 'Grupo F', 'grupos', 2, 'NRG Stadium',                     'Houston'),
  ('f-4', 'Túnez',                 'Japón',                  '21 jun 2026', '00:00 EDT', 'Grupo F', 'grupos', 2, 'Estadio BBVA',                    'Monterrey'),
  ('f-5', 'Japón',                 'Suecia',                 '25 jun 2026', '19:00 EDT', 'Grupo F', 'grupos', 3, 'AT&T Stadium',                    'Dallas'),
  ('f-6', 'Túnez',                 'Países Bajos',           '25 jun 2026', '19:00 EDT', 'Grupo F', 'grupos', 3, 'GEHA Field at Arrowhead Stadium', 'Kansas City'),
  ('g-1', 'Irán',                  'Nueva Zelanda',          '15 jun 2026', '21:00 EDT', 'Grupo G', 'grupos', 1, 'SoFi Stadium',                    'Los Angeles'),
  ('g-2', 'Bélgica',               'Egipto',                 '15 jun 2026', '15:00 EDT', 'Grupo G', 'grupos', 1, 'Lumen Field',                     'Seattle'),
  ('g-3', 'Bélgica',               'Irán',                   '21 jun 2026', '15:00 EDT', 'Grupo G', 'grupos', 2, 'SoFi Stadium',                    'Los Angeles'),
  ('g-4', 'Nueva Zelanda',         'Egipto',                 '21 jun 2026', '21:00 EDT', 'Grupo G', 'grupos', 2, 'BC Place',                        'Vancouver'),
  ('g-5', 'Egipto',                'Irán',                   '26 jun 2026', '23:00 EDT', 'Grupo G', 'grupos', 3, 'Lumen Field',                     'Seattle'),
  ('g-6', 'Nueva Zelanda',         'Bélgica',                '26 jun 2026', '23:00 EDT', 'Grupo G', 'grupos', 3, 'BC Place',                        'Vancouver'),
  ('h-1', 'España',                'Cabo Verde',             '15 jun 2026', '12:00 EDT', 'Grupo H', 'grupos', 1, 'Mercedes-Benz Stadium',           'Atlanta'),
  ('h-2', 'Arabia Saudita',        'Uruguay',                '15 jun 2026', '18:00 EDT', 'Grupo H', 'grupos', 1, 'Hard Rock Stadium',               'Miami'),
  ('h-3', 'España',                'Arabia Saudita',         '21 jun 2026', '12:00 EDT', 'Grupo H', 'grupos', 2, 'Mercedes-Benz Stadium',           'Atlanta'),
  ('h-4', 'Uruguay',               'Cabo Verde',             '21 jun 2026', '18:00 EDT', 'Grupo H', 'grupos', 2, 'Hard Rock Stadium',               'Miami'),
  ('h-5', 'Cabo Verde',            'Arabia Saudita',         '26 jun 2026', '20:00 EDT', 'Grupo H', 'grupos', 3, 'NRG Stadium',                     'Houston'),
  ('h-6', 'Uruguay',               'España',                 '26 jun 2026', '20:00 EDT', 'Grupo H', 'grupos', 3, 'Estadio Akron',                   'Guadalajara'),
  ('i-1', 'Francia',               'Senegal',                '16 jun 2026', '15:00 EDT', 'Grupo I', 'grupos', 1, 'MetLife Stadium',                 'New York/New Jersey'),
  ('i-2', 'Irak',                  'Noruega',                '16 jun 2026', '18:00 EDT', 'Grupo I', 'grupos', 1, 'Gillette Stadium',                'Boston'),
  ('i-3', 'Francia',               'Irak',                   '22 jun 2026', '17:00 EDT', 'Grupo I', 'grupos', 2, 'Lincoln Financial Field',         'Philadelphia'),
  ('i-4', 'Noruega',               'Senegal',                '22 jun 2026', '20:00 EDT', 'Grupo I', 'grupos', 2, 'MetLife Stadium',                 'New York/New Jersey'),
  ('i-5', 'Noruega',               'Francia',                '26 jun 2026', '15:00 EDT', 'Grupo I', 'grupos', 3, 'Gillette Stadium',                'Boston'),
  ('i-6', 'Senegal',               'Irak',                   '26 jun 2026', '15:00 EDT', 'Grupo I', 'grupos', 3, 'BMO Field',                       'Toronto'),
  ('j-1', 'Argentina',             'Argelia',                '16 jun 2026', '21:00 EDT', 'Grupo J', 'grupos', 1, 'GEHA Field at Arrowhead Stadium', 'Kansas City'),
  ('j-2', 'Austria',               'Jordania',               '17 jun 2026', '00:00 EDT', 'Grupo J', 'grupos', 1, 'Levi''s Stadium',                 'San Francisco Bay Area'),
  ('j-3', 'Argentina',             'Austria',                '22 jun 2026', '13:00 EDT', 'Grupo J', 'grupos', 2, 'AT&T Stadium',                    'Dallas'),
  ('j-4', 'Jordania',              'Argelia',                '22 jun 2026', '23:00 EDT', 'Grupo J', 'grupos', 2, 'Levi''s Stadium',                 'San Francisco Bay Area'),
  ('j-5', 'Argelia',               'Austria',                '27 jun 2026', '22:00 EDT', 'Grupo J', 'grupos', 3, 'GEHA Field at Arrowhead Stadium', 'Kansas City'),
  ('j-6', 'Jordania',              'Argentina',              '27 jun 2026', '22:00 EDT', 'Grupo J', 'grupos', 3, 'AT&T Stadium',                    'Dallas'),
  ('k-1', 'Portugal',              'RD Congo',               '17 jun 2026', '13:00 EDT', 'Grupo K', 'grupos', 1, 'NRG Stadium',                     'Houston'),
  ('k-2', 'Uzbekistán',            'Colombia',               '17 jun 2026', '22:00 EDT', 'Grupo K', 'grupos', 1, 'Estadio Azteca',                  'Ciudad de México'),
  ('k-3', 'Portugal',              'Uzbekistán',             '23 jun 2026', '13:00 EDT', 'Grupo K', 'grupos', 2, 'NRG Stadium',                     'Houston'),
  ('k-4', 'Colombia',              'RD Congo',               '23 jun 2026', '22:00 EDT', 'Grupo K', 'grupos', 2, 'Estadio Akron',                   'Guadalajara'),
  ('k-5', 'Colombia',              'Portugal',               '27 jun 2026', '19:00 EDT', 'Grupo K', 'grupos', 3, 'Hard Rock Stadium',               'Miami'),
  ('k-6', 'RD Congo',              'Uzbekistán',             '27 jun 2026', '19:00 EDT', 'Grupo K', 'grupos', 3, 'Mercedes-Benz Stadium',           'Atlanta'),
  ('l-1', 'Inglaterra',            'Croacia',                '17 jun 2026', '16:00 EDT', 'Grupo L', 'grupos', 1, 'AT&T Stadium',                    'Dallas'),
  ('l-2', 'Ghana',                 'Panamá',                 '17 jun 2026', '19:00 EDT', 'Grupo L', 'grupos', 1, 'BMO Field',                       'Toronto'),
  ('l-3', 'Inglaterra',            'Ghana',                  '23 jun 2026', '16:00 EDT', 'Grupo L', 'grupos', 2, 'Gillette Stadium',                'Boston'),
  ('l-4', 'Panamá',                'Croacia',                '23 jun 2026', '19:00 EDT', 'Grupo L', 'grupos', 2, 'BMO Field',                       'Toronto'),
  ('l-5', 'Panamá',                'Inglaterra',             '27 jun 2026', '17:00 EDT', 'Grupo L', 'grupos', 3, 'MetLife Stadium',                 'New York/New Jersey'),
  ('l-6', 'Croacia',               'Ghana',                  '27 jun 2026', '17:00 EDT', 'Grupo L', 'grupos', 3, 'Lincoln Financial Field',         'Philadelphia')
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
  updated_at   = now();

-- ---------------------------------------------------------------------------
-- 7. Constraints null-tolerantes (no rompen filas legacy con datos parciales).
-- ---------------------------------------------------------------------------
alter table public.matches drop constraint if exists matches_stage_check;
alter table public.matches
  add constraint matches_stage_check
  check (stage is null or stage in ('grupos','16avos','octavos','cuartos','semifinal','final'));

alter table public.matches drop constraint if exists matches_matchday_check;
alter table public.matches
  add constraint matches_matchday_check
  check (matchday is null or (matchday between 1 and 3));

-- ---------------------------------------------------------------------------
-- 8. Diagnóstico final: avisar de columnas legacy no migradas.
--    Imprime un NOTICE por cada columna en public.matches que no esté en el
--    schema esperado, así sabés cuáles podrías eliminar manualmente más
--    adelante (cuando confirmes que ya no las necesitás).
-- ---------------------------------------------------------------------------
do $$
declare
  rec record;
  expected text[] := array[
    'id', 'home_team', 'away_team', 'match_date', 'kickoff_time',
    'group_name', 'stage', 'matchday', 'venue', 'city',
    'created_at', 'updated_at'
  ];
begin
  for rec in
    select column_name
      from information_schema.columns
     where table_schema = 'public'
       and table_name   = 'matches'
       and column_name  <> all (expected)
     order by column_name
  loop
    raise notice
      'public.matches tiene columna legacy NO migrada: %. Revisala a mano si querés borrarla con `alter table public.matches drop column %I`.',
      rec.column_name, rec.column_name;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 9. Sanity check: cantidad de partidos del seed cargados.
-- ---------------------------------------------------------------------------
do $$
declare
  n int;
begin
  select count(*) into n
    from public.matches
   where stage = 'grupos'
     and group_name like 'Grupo %';
  raise notice 'public.matches tiene % partidos de grupos cargados (esperado: 72).', n;
end $$;
