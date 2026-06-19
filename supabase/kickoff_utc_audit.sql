-- =============================================================================
-- Prode Mundial 2026 — kickoff_utc_audit.sql
--
-- Audita TODOS los partidos: horario actual vs horario oficial FIFA (UTC).
-- Ejecutar ANTES y DESPUÉS de supabase/kickoff_utc_repair.sql.
-- =============================================================================

select
  m.id,
  m.home_team,
  m.away_team,
  m.kickoff_utc,
  m.kickoff_argentina as kickoff_legacy,
  m.kickoff_argentina_display,
  coalesce(m.kickoff_utc, m.kickoff_argentina) as kickoff_instant_actual,
  to_char(
    coalesce(m.kickoff_utc, m.kickoff_argentina) at time zone 'America/Argentina/Buenos_Aires',
    'YYYY-MM-DD HH24:MI'
  ) as hora_argentina_actual,
  case
    when m.kickoff_utc is null then 'sin_kickoff_utc'
    else 'ok'
  end as estado_kickoff_utc
from public.matches m
order by coalesce(m.kickoff_utc, m.kickoff_argentina) nulls last, m.id;

-- Canadá vs Qatar (b-4): debe quedar kickoff_utc = 2026-06-18 22:00 UTC → 19:00 ARG
select
  m.id,
  m.home_team || ' vs ' || m.away_team as partido,
  m.kickoff_utc,
  to_char(m.kickoff_utc at time zone 'America/Argentina/Buenos_Aires', 'HH24:MI') as hora_argentina,
  m.kickoff_utc = '2026-06-18T22:00:00Z'::timestamptz as utc_ok,
  to_char(m.kickoff_utc at time zone 'America/Argentina/Buenos_Aires', 'HH24:MI') = '19:00' as hora_arg_ok
from public.matches m
where m.id = 'b-4';
