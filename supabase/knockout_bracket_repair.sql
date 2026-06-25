-- =============================================================================
-- Prode Mundial 2026 — knockout_bracket_repair.sql
--
-- Repara placeholders y horarios de fase eliminatoria (R32/16avos primero).
-- NO cambia match_id → predicciones existentes siguen válidas.
--
-- Causa: officialRoundOf32Slots tenía cruces incorrectos (ej. 1A vs 2B en
-- 16avos-1) aunque el mapeo FIFA kickoff por id era correcto.
--
-- Fuente: FIFA M73–M88 / Sofascore bracket (jun 2026).
-- App: data/knockout.ts + data/knockoutKickoff.ts
--
-- Ejecutar en Supabase SQL Editor DESPUÉS de backup.
-- Idempotente: puede correrse varias veces.
-- =============================================================================

-- 1) Auditoría previa — predicciones KO (no modifica)
select
  p.match_id,
  count(*) as predictions,
  count(distinct p.user_id) as users
from public.predictions p
where p.match_id like '16avos-%'
   or p.match_id like 'octavos-%'
   or p.match_id like 'cuartos-%'
   or p.match_id like 'semifinal-%'
   or p.match_id in ('final-1', 'tercer-puesto')
group by p.match_id
order by p.match_id;

-- 2) Estado actual incorrecto (ejemplo del bug reportado)
select id, home_team, away_team, kickoff_utc, venue
from public.matches
where id in ('16avos-1', '16avos-3', '16avos-5', '16avos-7')
order by id;

-- 3) Reparar los 16 partidos de 16avos (placeholders + horarios FIFA)
update public.matches as m set
  home_team = v.home_team,
  away_team = v.away_team,
  match_date = v.match_date,
  kickoff_time = v.kickoff_time,
  kickoff_utc = v.kickoff_utc::timestamptz,
  kickoff_argentina = v.kickoff_utc::timestamptz,
  kickoff_argentina_display = v.kickoff_argentina_display,
  stage = '16avos',
  venue = v.venue,
  city = v.city,
  updated_at = now()
from (values
  ('16avos-1',  '1E', '3° A/B/C/D/F', '29 de jun de 2026', '17:30', '2026-06-29T20:30:00Z', '29 de jun de 2026 17:30 (Argentina)', 'Gillette Stadium', 'Boston'),
  ('16avos-2',  '1I', '3° C/D/F/G/H', '30 de jun de 2026', '18:00', '2026-06-30T21:00:00Z', '30 de jun de 2026 18:00 (Argentina)', 'MetLife Stadium', 'New York/New Jersey'),
  ('16avos-3',  '2A', '2B',           '28 de jun de 2026', '16:00', '2026-06-28T19:00:00Z', '28 de jun de 2026 16:00 (Argentina)', 'SoFi Stadium', 'Los Angeles'),
  ('16avos-4',  '1F', '2C',           '29 de jun de 2026', '22:00', '2026-06-30T01:00:00Z', '29 de jun de 2026 22:00 (Argentina)', 'Estadio BBVA', 'Monterrey'),
  ('16avos-5',  '1C', '2F',           '29 de jun de 2026', '14:00', '2026-06-29T17:00:00Z', '29 de jun de 2026 14:00 (Argentina)', 'NRG Stadium', 'Houston'),
  ('16avos-6',  '2E', '2I',           '30 de jun de 2026', '14:00', '2026-06-30T17:00:00Z', '30 de jun de 2026 14:00 (Argentina)', 'AT&T Stadium', 'Dallas'),
  ('16avos-7',  '1A', '3° C/E/F/H/I', '30 de jun de 2026', '22:00', '2026-07-01T01:00:00Z', '30 de jun de 2026 22:00 (Argentina)', 'Estadio Azteca', 'Mexico City'),
  ('16avos-8',  '1L', '3° E/H/I/J/K', '1 de jul de 2026',  '13:00', '2026-07-01T16:00:00Z', '1 de jul de 2026 13:00 (Argentina)',  'Mercedes-Benz Stadium', 'Atlanta'),
  ('16avos-9',  '2K', '2L',           '2 de jul de 2026',  '20:00', '2026-07-02T23:00:00Z', '2 de jul de 2026 20:00 (Argentina)',  'BMO Field', 'Toronto'),
  ('16avos-10', '1H', '2J',           '2 de jul de 2026',  '16:00', '2026-07-02T19:00:00Z', '2 de jul de 2026 16:00 (Argentina)',  'SoFi Stadium', 'Los Angeles'),
  ('16avos-11', '1D', '3° B/E/F/I/J', '1 de jul de 2026',  '21:00', '2026-07-02T00:00:00Z', '1 de jul de 2026 21:00 (Argentina)',  'Levi''s Stadium', 'San Francisco Bay Area'),
  ('16avos-12', '1G', '3° A/E/H/I/J', '1 de jul de 2026',  '17:00', '2026-07-01T20:00:00Z', '1 de jul de 2026 17:00 (Argentina)',  'Lumen Field', 'Seattle'),
  ('16avos-13', '1J', '2H',           '3 de jul de 2026',  '19:00', '2026-07-03T22:00:00Z', '3 de jul de 2026 19:00 (Argentina)',  'Hard Rock Stadium', 'Miami'),
  ('16avos-14', '2D', '2G',           '3 de jul de 2026',  '15:00', '2026-07-03T18:00:00Z', '3 de jul de 2026 15:00 (Argentina)',  'AT&T Stadium', 'Dallas'),
  ('16avos-15', '1B', '3° E/F/G/I/J', '3 de jul de 2026',  '00:00', '2026-07-03T03:00:00Z', '3 de jul de 2026 00:00 (Argentina)',  'BC Place', 'Vancouver'),
  ('16avos-16', '1K', '3° D/E/I/J/L', '3 de jul de 2026',  '22:30', '2026-07-04T01:30:00Z', '3 de jul de 2026 22:30 (Argentina)', 'Arrowhead Stadium', 'Kansas City')
) as v(id, home_team, away_team, match_date, kickoff_time, kickoff_utc, kickoff_argentina_display, venue, city)
where m.id = v.id;

-- 4) Verificación post-repair — casos críticos
select
  id,
  home_team || ' vs ' || away_team as slot_oficial,
  kickoff_utc,
  kickoff_argentina_display,
  venue
from public.matches
where id in ('16avos-1', '16avos-3', '16avos-5', '16avos-7')
order by kickoff_utc;

-- Esperado:
--   16avos-3 → 2A vs 2B @ 2026-06-28T19:00:00Z (16:00 ARG) SoFi
--   16avos-7 → 1A vs 3° C/E/F/H/I (México vs mejor 3°, NO vs Canadá)
--   16avos-1 → 1E vs 3° A/B/C/D/F (Alemania, NO México vs Canadá)

-- 5) Reparar octavos–final (placeholders ganador + horarios) — full seed
--    Ejecutar knockout_matches_seed.sql completo si octavos+ también están en DB.

-- 6) Overrides legacy BEST_THIRD_* → opcional migrar a THIRD_VS_1*
--    Solo si el admin fijó mejores terceros con el esquema viejo:
-- select slot, team_name from public.qualification_overrides
-- where slot like 'BEST_THIRD_%' order by slot;
