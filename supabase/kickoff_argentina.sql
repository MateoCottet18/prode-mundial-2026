-- =============================================================================
-- Prode Mundial 2026 — kickoff_argentina
--
-- Fuente de verdad para cierre de predicciones: hora oficial Argentina.
-- Formato: timestamptz con offset -03:00 (ej. 2026-06-14 01:00 ART).
--
-- Ejecutar en Supabase SQL Editor (idempotente).
-- =============================================================================

alter table public.matches
  add column if not exists kickoff_argentina timestamptz;

create index if not exists matches_kickoff_argentina_idx
  on public.matches (kickoff_argentina)
  where kickoff_argentina is not null;

-- ---------------------------------------------------------------------------
-- Seed: 72 partidos de fase de grupos (hora Argentina explícita)
-- ---------------------------------------------------------------------------
UPDATE public.matches SET kickoff_argentina = '2026-06-11T16:00:00-03:00'::timestamptz WHERE id = 'a-1';
UPDATE public.matches SET kickoff_argentina = '2026-06-11T22:00:00-03:00'::timestamptz WHERE id = 'a-2';
UPDATE public.matches SET kickoff_argentina = '2026-06-18T13:00:00-03:00'::timestamptz WHERE id = 'a-3';
UPDATE public.matches SET kickoff_argentina = '2026-06-18T22:00:00-03:00'::timestamptz WHERE id = 'a-4';
UPDATE public.matches SET kickoff_argentina = '2026-06-24T22:00:00-03:00'::timestamptz WHERE id = 'a-5';
UPDATE public.matches SET kickoff_argentina = '2026-06-24T22:00:00-03:00'::timestamptz WHERE id = 'a-6';
UPDATE public.matches SET kickoff_argentina = '2026-06-12T16:00:00-03:00'::timestamptz WHERE id = 'b-1';
UPDATE public.matches SET kickoff_argentina = '2026-06-13T16:00:00-03:00'::timestamptz WHERE id = 'b-2';
UPDATE public.matches SET kickoff_argentina = '2026-06-18T16:00:00-03:00'::timestamptz WHERE id = 'b-3';
UPDATE public.matches SET kickoff_argentina = '2026-06-18T22:00:00-03:00'::timestamptz WHERE id = 'b-4';
UPDATE public.matches SET kickoff_argentina = '2026-06-24T22:00:00-03:00'::timestamptz WHERE id = 'b-5';
UPDATE public.matches SET kickoff_argentina = '2026-06-24T16:00:00-03:00'::timestamptz WHERE id = 'b-6';
UPDATE public.matches SET kickoff_argentina = '2026-06-13T19:00:00-03:00'::timestamptz WHERE id = 'c-1';
UPDATE public.matches SET kickoff_argentina = '2026-06-13T22:00:00-03:00'::timestamptz WHERE id = 'c-2';
UPDATE public.matches SET kickoff_argentina = '2026-06-19T19:00:00-03:00'::timestamptz WHERE id = 'c-3';
UPDATE public.matches SET kickoff_argentina = '2026-06-19T22:00:00-03:00'::timestamptz WHERE id = 'c-4';
UPDATE public.matches SET kickoff_argentina = '2026-06-24T19:00:00-03:00'::timestamptz WHERE id = 'c-5';
UPDATE public.matches SET kickoff_argentina = '2026-06-24T19:00:00-03:00'::timestamptz WHERE id = 'c-6';
UPDATE public.matches SET kickoff_argentina = '2026-06-12T22:00:00-03:00'::timestamptz WHERE id = 'd-1';
UPDATE public.matches SET kickoff_argentina = '2026-06-14T01:00:00-03:00'::timestamptz WHERE id = 'd-2'; -- Australia vs Turquía
UPDATE public.matches SET kickoff_argentina = '2026-06-19T16:00:00-03:00'::timestamptz WHERE id = 'd-3';
UPDATE public.matches SET kickoff_argentina = '2026-06-19T22:00:00-03:00'::timestamptz WHERE id = 'd-4';
UPDATE public.matches SET kickoff_argentina = '2026-06-25T23:00:00-03:00'::timestamptz WHERE id = 'd-5';
UPDATE public.matches SET kickoff_argentina = '2026-06-25T23:00:00-03:00'::timestamptz WHERE id = 'd-6';
UPDATE public.matches SET kickoff_argentina = '2026-06-14T14:00:00-03:00'::timestamptz WHERE id = 'e-1';
UPDATE public.matches SET kickoff_argentina = '2026-06-14T20:00:00-03:00'::timestamptz WHERE id = 'e-2';
UPDATE public.matches SET kickoff_argentina = '2026-06-20T17:00:00-03:00'::timestamptz WHERE id = 'e-3';
UPDATE public.matches SET kickoff_argentina = '2026-06-20T21:00:00-03:00'::timestamptz WHERE id = 'e-4';
UPDATE public.matches SET kickoff_argentina = '2026-06-25T17:00:00-03:00'::timestamptz WHERE id = 'e-5';
UPDATE public.matches SET kickoff_argentina = '2026-06-25T17:00:00-03:00'::timestamptz WHERE id = 'e-6';
UPDATE public.matches SET kickoff_argentina = '2026-06-14T17:00:00-03:00'::timestamptz WHERE id = 'f-1';
UPDATE public.matches SET kickoff_argentina = '2026-06-14T22:00:00-03:00'::timestamptz WHERE id = 'f-2';
UPDATE public.matches SET kickoff_argentina = '2026-06-20T14:00:00-03:00'::timestamptz WHERE id = 'f-3';
UPDATE public.matches SET kickoff_argentina = '2026-06-22T01:00:00-03:00'::timestamptz WHERE id = 'f-4';
UPDATE public.matches SET kickoff_argentina = '2026-06-25T20:00:00-03:00'::timestamptz WHERE id = 'f-5';
UPDATE public.matches SET kickoff_argentina = '2026-06-25T20:00:00-03:00'::timestamptz WHERE id = 'f-6';
UPDATE public.matches SET kickoff_argentina = '2026-06-15T22:00:00-03:00'::timestamptz WHERE id = 'g-1';
UPDATE public.matches SET kickoff_argentina = '2026-06-15T16:00:00-03:00'::timestamptz WHERE id = 'g-2';
UPDATE public.matches SET kickoff_argentina = '2026-06-21T16:00:00-03:00'::timestamptz WHERE id = 'g-3';
UPDATE public.matches SET kickoff_argentina = '2026-06-21T22:00:00-03:00'::timestamptz WHERE id = 'g-4';
UPDATE public.matches SET kickoff_argentina = '2026-06-27T00:00:00-03:00'::timestamptz WHERE id = 'g-5';
UPDATE public.matches SET kickoff_argentina = '2026-06-27T00:00:00-03:00'::timestamptz WHERE id = 'g-6';
UPDATE public.matches SET kickoff_argentina = '2026-06-15T13:00:00-03:00'::timestamptz WHERE id = 'h-1';
UPDATE public.matches SET kickoff_argentina = '2026-06-15T19:00:00-03:00'::timestamptz WHERE id = 'h-2';
UPDATE public.matches SET kickoff_argentina = '2026-06-21T13:00:00-03:00'::timestamptz WHERE id = 'h-3';
UPDATE public.matches SET kickoff_argentina = '2026-06-21T19:00:00-03:00'::timestamptz WHERE id = 'h-4';
UPDATE public.matches SET kickoff_argentina = '2026-06-26T21:00:00-03:00'::timestamptz WHERE id = 'h-5';
UPDATE public.matches SET kickoff_argentina = '2026-06-26T21:00:00-03:00'::timestamptz WHERE id = 'h-6';
UPDATE public.matches SET kickoff_argentina = '2026-06-16T16:00:00-03:00'::timestamptz WHERE id = 'i-1';
UPDATE public.matches SET kickoff_argentina = '2026-06-16T19:00:00-03:00'::timestamptz WHERE id = 'i-2';
UPDATE public.matches SET kickoff_argentina = '2026-06-22T18:00:00-03:00'::timestamptz WHERE id = 'i-3';
UPDATE public.matches SET kickoff_argentina = '2026-06-22T21:00:00-03:00'::timestamptz WHERE id = 'i-4';
UPDATE public.matches SET kickoff_argentina = '2026-06-26T16:00:00-03:00'::timestamptz WHERE id = 'i-5';
UPDATE public.matches SET kickoff_argentina = '2026-06-26T16:00:00-03:00'::timestamptz WHERE id = 'i-6';
UPDATE public.matches SET kickoff_argentina = '2026-06-16T22:00:00-03:00'::timestamptz WHERE id = 'j-1';
UPDATE public.matches SET kickoff_argentina = '2026-06-18T01:00:00-03:00'::timestamptz WHERE id = 'j-2';
UPDATE public.matches SET kickoff_argentina = '2026-06-22T14:00:00-03:00'::timestamptz WHERE id = 'j-3';
UPDATE public.matches SET kickoff_argentina = '2026-06-23T00:00:00-03:00'::timestamptz WHERE id = 'j-4';
UPDATE public.matches SET kickoff_argentina = '2026-06-27T23:00:00-03:00'::timestamptz WHERE id = 'j-5';
UPDATE public.matches SET kickoff_argentina = '2026-06-27T23:00:00-03:00'::timestamptz WHERE id = 'j-6';
UPDATE public.matches SET kickoff_argentina = '2026-06-17T14:00:00-03:00'::timestamptz WHERE id = 'k-1';
UPDATE public.matches SET kickoff_argentina = '2026-06-17T23:00:00-03:00'::timestamptz WHERE id = 'k-2';
UPDATE public.matches SET kickoff_argentina = '2026-06-23T14:00:00-03:00'::timestamptz WHERE id = 'k-3';
UPDATE public.matches SET kickoff_argentina = '2026-06-23T23:00:00-03:00'::timestamptz WHERE id = 'k-4';
UPDATE public.matches SET kickoff_argentina = '2026-06-27T20:00:00-03:00'::timestamptz WHERE id = 'k-5';
UPDATE public.matches SET kickoff_argentina = '2026-06-27T20:00:00-03:00'::timestamptz WHERE id = 'k-6';
UPDATE public.matches SET kickoff_argentina = '2026-06-17T17:00:00-03:00'::timestamptz WHERE id = 'l-1';
UPDATE public.matches SET kickoff_argentina = '2026-06-17T20:00:00-03:00'::timestamptz WHERE id = 'l-2';
UPDATE public.matches SET kickoff_argentina = '2026-06-23T17:00:00-03:00'::timestamptz WHERE id = 'l-3';
UPDATE public.matches SET kickoff_argentina = '2026-06-23T20:00:00-03:00'::timestamptz WHERE id = 'l-4';
UPDATE public.matches SET kickoff_argentina = '2026-06-27T18:00:00-03:00'::timestamptz WHERE id = 'l-5';
UPDATE public.matches SET kickoff_argentina = '2026-06-27T18:00:00-03:00'::timestamptz WHERE id = 'l-6';

-- Verificación rápida
-- select id, home_team, away_team, kickoff_argentina
-- from public.matches
-- where id in ('d-2', 'a-1', 'j-1')
-- order by kickoff_argentina;
