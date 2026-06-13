-- =============================================================================
-- Prode Mundial 2026 — public.matches
--
-- Tabla canónica del calendario de fase de grupos del Mundial 2026 (72 partidos).
--
-- Diseño:
--   - `id` text primary key, mismo formato que ya usa la app ("a-1", "b-3", …).
--     Esto preserva la compatibilidad con `predictions.match_id` y
--     `results.match_id` (ambos text, sin FK).
--   - Los partidos de eliminación directa NO se persisten porque sus equipos
--     dependen de las posiciones reales de cada grupo y se generan
--     dinámicamente en `lib/standings.ts > getKnockoutMatches()`.
--   - Esta migración es IDEMPOTENTE:
--       * `create table if not exists` para no romper si ya existe.
--       * `insert ... on conflict (id) do update` para refrescar nombres,
--         sedes y horarios sin duplicar filas.
--
-- RLS:
--   - Lectura pública (anon + authenticated) → la app puede leer sin login.
--   - Escritura sólo con `public.is_admin()` (función ya definida en
--     `supabase/schema.sql`). Service role bypasea RLS para seeds.
-- =============================================================================

create table if not exists public.matches (
  id            text primary key,
  home_team     text not null,
  away_team     text not null,
  match_date    text,
  kickoff_time  text,
  kickoff_argentina timestamptz,
  group_name    text,
  stage         text not null,
  matchday      smallint,
  venue         text,
  city          text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.matches drop constraint if exists matches_stage_check;
alter table public.matches
  add constraint matches_stage_check
  check (stage in ('grupos', '16avos', 'octavos', 'cuartos', 'semifinal', 'final'));

alter table public.matches drop constraint if exists matches_matchday_check;
alter table public.matches
  add constraint matches_matchday_check
  check (matchday is null or matchday between 1 and 3);

drop trigger if exists matches_touch_updated_at on public.matches;
create trigger matches_touch_updated_at
  before update on public.matches
  for each row execute function public.touch_updated_at();

-- Índices: la UI filtra por stage (grupos/16avos/…) y ordena por matchday.
create index if not exists matches_stage_idx
  on public.matches (stage);

create index if not exists matches_matchday_idx
  on public.matches (matchday)
  where matchday is not null;

-- ---------------------------------------------------------------------------
-- RLS
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
-- Seed: 72 partidos de fase de grupos.
--
-- Re-ejecutar este script ACTUALIZA campos (date/venue/etc.) si cambiaron en
-- `data/matches.ts` y vuelve a correr el SQL, sin duplicar filas.
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
