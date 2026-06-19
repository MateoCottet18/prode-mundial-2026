-- =============================================================================
-- Prode Mundial 2026 — audit_knockout_matches.sql
--
-- Audita partidos de fase eliminatoria en public.matches.
-- Ejecutar UN bloque a la vez.
--
-- NOTA ARQUITECTURA (post knockout_matches_seed.sql):
--   public.matches tiene 72 grupos + 32 KO (placeholders + kickoff_utc).
--   La app resuelve equipos KO en cliente; horarios vienen de kickoff_utc en DB.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- A) CONTEO POR FASE
-- ---------------------------------------------------------------------------
select
  stage,
  count(*) as partidos,
  count(*) filter (where kickoff_utc is not null) as con_kickoff_utc,
  count(*) filter (where kickoff_utc is null) as sin_kickoff_utc
from public.matches
where stage <> 'grupos'
group by stage
order by case stage
  when '16avos' then 1
  when 'octavos' then 2
  when 'cuartos' then 3
  when 'semifinal' then 4
  when 'final' then 5
  else 99
end;

-- ---------------------------------------------------------------------------
-- B) RESUMEN vs ESPERADO
--   R32=16, R16=8, QF=4, SF=2, Final+3P=2 (stage final)
-- ---------------------------------------------------------------------------
select
  count(*) filter (where stage = '16avos') as r32_16avos,
  count(*) filter (where stage = 'octavos') as r16_octavos,
  count(*) filter (where stage = 'cuartos') as qf_cuartos,
  count(*) filter (where stage = 'semifinal') as sf_semis,
  count(*) filter (where stage = 'final') as final_y_tercer_puesto,
  count(*) filter (where stage <> 'grupos') as total_knockout,
  count(*) filter (where stage <> 'grupos' and kickoff_utc is null) as ko_sin_kickoff
from public.matches;

-- Esperado total_knockout = 32 si todos los KO están persistidos.

-- ---------------------------------------------------------------------------
-- C) DETALLE: id, round, equipos, kickoff UTC, hora Argentina
-- ---------------------------------------------------------------------------
select
  m.id,
  case m.stage
    when '16avos' then 'R32'
    when 'octavos' then 'R16'
    when 'cuartos' then 'QF'
    when 'semifinal' then 'SF'
    when 'final' then
      case when m.id = 'tercer-puesto' then '3P' else 'FINAL' end
    else m.stage
  end as round,
  m.home_team,
  m.away_team,
  m.kickoff_utc,
  to_char(
    m.kickoff_utc at time zone 'America/Argentina/Buenos_Aires',
    'YYYY-MM-DD HH24:MI'
  ) as hora_argentina,
  m.kickoff_argentina_display,
  case when m.kickoff_utc is null then 'SIN_HORARIO' else 'OK' end as estado
from public.matches m
where m.stage <> 'grupos'
order by
  case m.stage
    when '16avos' then 1
    when 'octavos' then 2
    when 'cuartos' then 3
    when 'semifinal' then 4
    when 'final' then 5
    else 99
  end,
  m.id;

-- ---------------------------------------------------------------------------
-- D) SOLO los que faltan kickoff_utc
-- ---------------------------------------------------------------------------
select
  m.id,
  case m.stage
    when '16avos' then 'R32'
    when 'octavos' then 'R16'
    when 'cuartos' then 'QF'
    when 'semifinal' then 'SF'
    when 'final' then
      case when m.id = 'tercer-puesto' then '3P' else 'FINAL' end
    else m.stage
  end as round,
  m.home_team,
  m.away_team
from public.matches m
where m.stage <> 'grupos'
  and m.kickoff_utc is null
order by m.id;

-- ---------------------------------------------------------------------------
-- E) Predicciones/resultados KO sin fila en matches (huérfanos)
-- ---------------------------------------------------------------------------
select distinct p.match_id, 'prediction' as tipo
from public.predictions p
where p.match_id like '16avos-%'
   or p.match_id like 'octavos-%'
   or p.match_id like 'cuartos-%'
   or p.match_id like 'semifinal-%'
   or p.match_id like 'final-%'
   or p.match_id = 'tercer-puesto'
union
select distinct r.match_id, 'result' as tipo
from public.results r
where r.match_id like '16avos-%'
   or r.match_id like 'octavos-%'
   or r.match_id like 'cuartos-%'
   or r.match_id like 'semifinal-%'
   or r.match_id like 'final-%'
   or r.match_id = 'tercer-puesto'
order by match_id;

-- ---------------------------------------------------------------------------
-- F) ¿Hay algún KO en DB? (diagnóstico rápido)
-- ---------------------------------------------------------------------------
select
  count(*) filter (where stage = 'grupos') as partidos_grupos,
  count(*) filter (where stage <> 'grupos') as partidos_eliminatoria
from public.matches;
