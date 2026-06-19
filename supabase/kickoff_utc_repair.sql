-- =============================================================================
-- Prode Mundial 2026 — kickoff_utc_repair.sql
--
-- Fuente de verdad del cierre: kickoff_utc (horario oficial FIFA en UTC).
-- kickoff_argentina = mismo instante (compat legacy).
-- kickoff_argentina_display = etiqueta legible hora Argentina.
--
-- Idempotente. Ejecutar en Supabase SQL Editor.
-- Generado: 2026-06-19T02:49:09.830Z
-- =============================================================================

alter table public.matches
  add column if not exists kickoff_utc timestamptz;

alter table public.matches
  add column if not exists kickoff_argentina_display text;

create index if not exists matches_kickoff_utc_idx
  on public.matches (kickoff_utc)
  where kickoff_utc is not null;

comment on column public.matches.kickoff_utc is
  'Kickoff oficial FIFA (UTC). Fuente de verdad para cierre de predicciones.';

comment on column public.matches.kickoff_argentina_display is
  'Etiqueta legible en hora Argentina (solo UI).';

-- ---------------------------------------------------------------------------
-- Actualización de los 72 partidos de grupos
-- ---------------------------------------------------------------------------

UPDATE public.matches SET
  kickoff_utc = '2026-06-11T19:00:00Z'::timestamptz,
  kickoff_argentina = '2026-06-11T19:00:00Z'::timestamptz,
  kickoff_argentina_display = '11 de jun de 2026 16:00 (Argentina)'
WHERE id = 'a-1'; -- México vs Sudáfrica

UPDATE public.matches SET
  kickoff_utc = '2026-06-12T02:00:00Z'::timestamptz,
  kickoff_argentina = '2026-06-12T02:00:00Z'::timestamptz,
  kickoff_argentina_display = '11 de jun de 2026 23:00 (Argentina)'
WHERE id = 'a-2'; -- Corea del Sur vs Chequia

UPDATE public.matches SET
  kickoff_utc = '2026-06-18T16:00:00Z'::timestamptz,
  kickoff_argentina = '2026-06-18T16:00:00Z'::timestamptz,
  kickoff_argentina_display = '18 de jun de 2026 13:00 (Argentina)'
WHERE id = 'a-3'; -- Chequia vs Sudáfrica

UPDATE public.matches SET
  kickoff_utc = '2026-06-19T01:00:00Z'::timestamptz,
  kickoff_argentina = '2026-06-19T01:00:00Z'::timestamptz,
  kickoff_argentina_display = '18 de jun de 2026 22:00 (Argentina)'
WHERE id = 'a-4'; -- México vs Corea del Sur

UPDATE public.matches SET
  kickoff_utc = '2026-06-25T01:00:00Z'::timestamptz,
  kickoff_argentina = '2026-06-25T01:00:00Z'::timestamptz,
  kickoff_argentina_display = '24 de jun de 2026 22:00 (Argentina)'
WHERE id = 'a-5'; -- Chequia vs México

UPDATE public.matches SET
  kickoff_utc = '2026-06-25T01:00:00Z'::timestamptz,
  kickoff_argentina = '2026-06-25T01:00:00Z'::timestamptz,
  kickoff_argentina_display = '24 de jun de 2026 22:00 (Argentina)'
WHERE id = 'a-6'; -- Sudáfrica vs Corea del Sur

UPDATE public.matches SET
  kickoff_utc = '2026-06-12T19:00:00Z'::timestamptz,
  kickoff_argentina = '2026-06-12T19:00:00Z'::timestamptz,
  kickoff_argentina_display = '12 de jun de 2026 16:00 (Argentina)'
WHERE id = 'b-1'; -- Canadá vs Bosnia y Herzegovina

UPDATE public.matches SET
  kickoff_utc = '2026-06-13T19:00:00Z'::timestamptz,
  kickoff_argentina = '2026-06-13T19:00:00Z'::timestamptz,
  kickoff_argentina_display = '13 de jun de 2026 16:00 (Argentina)'
WHERE id = 'b-2'; -- Qatar vs Suiza

UPDATE public.matches SET
  kickoff_utc = '2026-06-18T19:00:00Z'::timestamptz,
  kickoff_argentina = '2026-06-18T19:00:00Z'::timestamptz,
  kickoff_argentina_display = '18 de jun de 2026 16:00 (Argentina)'
WHERE id = 'b-3'; -- Suiza vs Bosnia y Herzegovina

UPDATE public.matches SET
  kickoff_utc = '2026-06-18T22:00:00Z'::timestamptz,
  kickoff_argentina = '2026-06-18T22:00:00Z'::timestamptz,
  kickoff_argentina_display = '18 de jun de 2026 19:00 (Argentina)'
WHERE id = 'b-4'; -- Canadá vs Qatar

UPDATE public.matches SET
  kickoff_utc = '2026-06-24T19:00:00Z'::timestamptz,
  kickoff_argentina = '2026-06-24T19:00:00Z'::timestamptz,
  kickoff_argentina_display = '24 de jun de 2026 16:00 (Argentina)'
WHERE id = 'b-5'; -- Suiza vs Canadá

UPDATE public.matches SET
  kickoff_utc = '2026-06-24T19:00:00Z'::timestamptz,
  kickoff_argentina = '2026-06-24T19:00:00Z'::timestamptz,
  kickoff_argentina_display = '24 de jun de 2026 16:00 (Argentina)'
WHERE id = 'b-6'; -- Bosnia y Herzegovina vs Qatar

UPDATE public.matches SET
  kickoff_utc = '2026-06-13T22:00:00Z'::timestamptz,
  kickoff_argentina = '2026-06-13T22:00:00Z'::timestamptz,
  kickoff_argentina_display = '13 de jun de 2026 19:00 (Argentina)'
WHERE id = 'c-1'; -- Brasil vs Marruecos

UPDATE public.matches SET
  kickoff_utc = '2026-06-14T01:00:00Z'::timestamptz,
  kickoff_argentina = '2026-06-14T01:00:00Z'::timestamptz,
  kickoff_argentina_display = '13 de jun de 2026 22:00 (Argentina)'
WHERE id = 'c-2'; -- Haití vs Escocia

UPDATE public.matches SET
  kickoff_utc = '2026-06-19T22:00:00Z'::timestamptz,
  kickoff_argentina = '2026-06-19T22:00:00Z'::timestamptz,
  kickoff_argentina_display = '19 de jun de 2026 19:00 (Argentina)'
WHERE id = 'c-3'; -- Escocia vs Marruecos

UPDATE public.matches SET
  kickoff_utc = '2026-06-20T00:30:00Z'::timestamptz,
  kickoff_argentina = '2026-06-20T00:30:00Z'::timestamptz,
  kickoff_argentina_display = '19 de jun de 2026 21:30 (Argentina)'
WHERE id = 'c-4'; -- Brasil vs Haití

UPDATE public.matches SET
  kickoff_utc = '2026-06-24T22:00:00Z'::timestamptz,
  kickoff_argentina = '2026-06-24T22:00:00Z'::timestamptz,
  kickoff_argentina_display = '24 de jun de 2026 19:00 (Argentina)'
WHERE id = 'c-5'; -- Escocia vs Brasil

UPDATE public.matches SET
  kickoff_utc = '2026-06-24T22:00:00Z'::timestamptz,
  kickoff_argentina = '2026-06-24T22:00:00Z'::timestamptz,
  kickoff_argentina_display = '24 de jun de 2026 19:00 (Argentina)'
WHERE id = 'c-6'; -- Marruecos vs Haití

UPDATE public.matches SET
  kickoff_utc = '2026-06-13T01:00:00Z'::timestamptz,
  kickoff_argentina = '2026-06-13T01:00:00Z'::timestamptz,
  kickoff_argentina_display = '12 de jun de 2026 22:00 (Argentina)'
WHERE id = 'd-1'; -- Estados Unidos vs Paraguay

UPDATE public.matches SET
  kickoff_utc = '2026-06-14T04:00:00Z'::timestamptz,
  kickoff_argentina = '2026-06-14T04:00:00Z'::timestamptz,
  kickoff_argentina_display = '14 de jun de 2026 01:00 (Argentina)'
WHERE id = 'd-2'; -- Australia vs Turquía

UPDATE public.matches SET
  kickoff_utc = '2026-06-19T19:00:00Z'::timestamptz,
  kickoff_argentina = '2026-06-19T19:00:00Z'::timestamptz,
  kickoff_argentina_display = '19 de jun de 2026 16:00 (Argentina)'
WHERE id = 'd-3'; -- Estados Unidos vs Australia

UPDATE public.matches SET
  kickoff_utc = '2026-06-20T03:00:00Z'::timestamptz,
  kickoff_argentina = '2026-06-20T03:00:00Z'::timestamptz,
  kickoff_argentina_display = '20 de jun de 2026 00:00 (Argentina)'
WHERE id = 'd-4'; -- Turquía vs Paraguay

UPDATE public.matches SET
  kickoff_utc = '2026-06-26T02:00:00Z'::timestamptz,
  kickoff_argentina = '2026-06-26T02:00:00Z'::timestamptz,
  kickoff_argentina_display = '25 de jun de 2026 23:00 (Argentina)'
WHERE id = 'd-5'; -- Turquía vs Estados Unidos

UPDATE public.matches SET
  kickoff_utc = '2026-06-26T02:00:00Z'::timestamptz,
  kickoff_argentina = '2026-06-26T02:00:00Z'::timestamptz,
  kickoff_argentina_display = '25 de jun de 2026 23:00 (Argentina)'
WHERE id = 'd-6'; -- Paraguay vs Australia

UPDATE public.matches SET
  kickoff_utc = '2026-06-14T17:00:00Z'::timestamptz,
  kickoff_argentina = '2026-06-14T17:00:00Z'::timestamptz,
  kickoff_argentina_display = '14 de jun de 2026 14:00 (Argentina)'
WHERE id = 'e-1'; -- Alemania vs Curazao

UPDATE public.matches SET
  kickoff_utc = '2026-06-14T23:00:00Z'::timestamptz,
  kickoff_argentina = '2026-06-14T23:00:00Z'::timestamptz,
  kickoff_argentina_display = '14 de jun de 2026 20:00 (Argentina)'
WHERE id = 'e-2'; -- Costa de Marfil vs Ecuador

UPDATE public.matches SET
  kickoff_utc = '2026-06-20T20:00:00Z'::timestamptz,
  kickoff_argentina = '2026-06-20T20:00:00Z'::timestamptz,
  kickoff_argentina_display = '20 de jun de 2026 17:00 (Argentina)'
WHERE id = 'e-3'; -- Alemania vs Costa de Marfil

UPDATE public.matches SET
  kickoff_utc = '2026-06-21T00:00:00Z'::timestamptz,
  kickoff_argentina = '2026-06-21T00:00:00Z'::timestamptz,
  kickoff_argentina_display = '20 de jun de 2026 21:00 (Argentina)'
WHERE id = 'e-4'; -- Ecuador vs Curazao

UPDATE public.matches SET
  kickoff_utc = '2026-06-25T20:00:00Z'::timestamptz,
  kickoff_argentina = '2026-06-25T20:00:00Z'::timestamptz,
  kickoff_argentina_display = '25 de jun de 2026 17:00 (Argentina)'
WHERE id = 'e-5'; -- Ecuador vs Alemania

UPDATE public.matches SET
  kickoff_utc = '2026-06-25T20:00:00Z'::timestamptz,
  kickoff_argentina = '2026-06-25T20:00:00Z'::timestamptz,
  kickoff_argentina_display = '25 de jun de 2026 17:00 (Argentina)'
WHERE id = 'e-6'; -- Curazao vs Costa de Marfil

UPDATE public.matches SET
  kickoff_utc = '2026-06-14T20:00:00Z'::timestamptz,
  kickoff_argentina = '2026-06-14T20:00:00Z'::timestamptz,
  kickoff_argentina_display = '14 de jun de 2026 17:00 (Argentina)'
WHERE id = 'f-1'; -- Países Bajos vs Japón

UPDATE public.matches SET
  kickoff_utc = '2026-06-15T02:00:00Z'::timestamptz,
  kickoff_argentina = '2026-06-15T02:00:00Z'::timestamptz,
  kickoff_argentina_display = '14 de jun de 2026 23:00 (Argentina)'
WHERE id = 'f-2'; -- Suecia vs Túnez

UPDATE public.matches SET
  kickoff_utc = '2026-06-20T17:00:00Z'::timestamptz,
  kickoff_argentina = '2026-06-20T17:00:00Z'::timestamptz,
  kickoff_argentina_display = '20 de jun de 2026 14:00 (Argentina)'
WHERE id = 'f-3'; -- Países Bajos vs Suecia

UPDATE public.matches SET
  kickoff_utc = '2026-06-21T04:00:00Z'::timestamptz,
  kickoff_argentina = '2026-06-21T04:00:00Z'::timestamptz,
  kickoff_argentina_display = '21 de jun de 2026 01:00 (Argentina)'
WHERE id = 'f-4'; -- Túnez vs Japón

UPDATE public.matches SET
  kickoff_utc = '2026-06-25T23:00:00Z'::timestamptz,
  kickoff_argentina = '2026-06-25T23:00:00Z'::timestamptz,
  kickoff_argentina_display = '25 de jun de 2026 20:00 (Argentina)'
WHERE id = 'f-5'; -- Japón vs Suecia

UPDATE public.matches SET
  kickoff_utc = '2026-06-25T23:00:00Z'::timestamptz,
  kickoff_argentina = '2026-06-25T23:00:00Z'::timestamptz,
  kickoff_argentina_display = '25 de jun de 2026 20:00 (Argentina)'
WHERE id = 'f-6'; -- Túnez vs Países Bajos

UPDATE public.matches SET
  kickoff_utc = '2026-06-16T01:00:00Z'::timestamptz,
  kickoff_argentina = '2026-06-16T01:00:00Z'::timestamptz,
  kickoff_argentina_display = '15 de jun de 2026 22:00 (Argentina)'
WHERE id = 'g-1'; -- Irán vs Nueva Zelanda

UPDATE public.matches SET
  kickoff_utc = '2026-06-15T19:00:00Z'::timestamptz,
  kickoff_argentina = '2026-06-15T19:00:00Z'::timestamptz,
  kickoff_argentina_display = '15 de jun de 2026 16:00 (Argentina)'
WHERE id = 'g-2'; -- Bélgica vs Egipto

UPDATE public.matches SET
  kickoff_utc = '2026-06-21T19:00:00Z'::timestamptz,
  kickoff_argentina = '2026-06-21T19:00:00Z'::timestamptz,
  kickoff_argentina_display = '21 de jun de 2026 16:00 (Argentina)'
WHERE id = 'g-3'; -- Bélgica vs Irán

UPDATE public.matches SET
  kickoff_utc = '2026-06-22T01:00:00Z'::timestamptz,
  kickoff_argentina = '2026-06-22T01:00:00Z'::timestamptz,
  kickoff_argentina_display = '21 de jun de 2026 22:00 (Argentina)'
WHERE id = 'g-4'; -- Nueva Zelanda vs Egipto

UPDATE public.matches SET
  kickoff_utc = '2026-06-27T03:00:00Z'::timestamptz,
  kickoff_argentina = '2026-06-27T03:00:00Z'::timestamptz,
  kickoff_argentina_display = '27 de jun de 2026 00:00 (Argentina)'
WHERE id = 'g-5'; -- Egipto vs Irán

UPDATE public.matches SET
  kickoff_utc = '2026-06-27T03:00:00Z'::timestamptz,
  kickoff_argentina = '2026-06-27T03:00:00Z'::timestamptz,
  kickoff_argentina_display = '27 de jun de 2026 00:00 (Argentina)'
WHERE id = 'g-6'; -- Nueva Zelanda vs Bélgica

UPDATE public.matches SET
  kickoff_utc = '2026-06-15T16:00:00Z'::timestamptz,
  kickoff_argentina = '2026-06-15T16:00:00Z'::timestamptz,
  kickoff_argentina_display = '15 de jun de 2026 13:00 (Argentina)'
WHERE id = 'h-1'; -- España vs Cabo Verde

UPDATE public.matches SET
  kickoff_utc = '2026-06-15T22:00:00Z'::timestamptz,
  kickoff_argentina = '2026-06-15T22:00:00Z'::timestamptz,
  kickoff_argentina_display = '15 de jun de 2026 19:00 (Argentina)'
WHERE id = 'h-2'; -- Arabia Saudita vs Uruguay

UPDATE public.matches SET
  kickoff_utc = '2026-06-21T16:00:00Z'::timestamptz,
  kickoff_argentina = '2026-06-21T16:00:00Z'::timestamptz,
  kickoff_argentina_display = '21 de jun de 2026 13:00 (Argentina)'
WHERE id = 'h-3'; -- España vs Arabia Saudita

UPDATE public.matches SET
  kickoff_utc = '2026-06-21T22:00:00Z'::timestamptz,
  kickoff_argentina = '2026-06-21T22:00:00Z'::timestamptz,
  kickoff_argentina_display = '21 de jun de 2026 19:00 (Argentina)'
WHERE id = 'h-4'; -- Uruguay vs Cabo Verde

UPDATE public.matches SET
  kickoff_utc = '2026-06-27T00:00:00Z'::timestamptz,
  kickoff_argentina = '2026-06-27T00:00:00Z'::timestamptz,
  kickoff_argentina_display = '26 de jun de 2026 21:00 (Argentina)'
WHERE id = 'h-5'; -- Cabo Verde vs Arabia Saudita

UPDATE public.matches SET
  kickoff_utc = '2026-06-27T00:00:00Z'::timestamptz,
  kickoff_argentina = '2026-06-27T00:00:00Z'::timestamptz,
  kickoff_argentina_display = '26 de jun de 2026 21:00 (Argentina)'
WHERE id = 'h-6'; -- Uruguay vs España

UPDATE public.matches SET
  kickoff_utc = '2026-06-16T19:00:00Z'::timestamptz,
  kickoff_argentina = '2026-06-16T19:00:00Z'::timestamptz,
  kickoff_argentina_display = '16 de jun de 2026 16:00 (Argentina)'
WHERE id = 'i-1'; -- Francia vs Senegal

UPDATE public.matches SET
  kickoff_utc = '2026-06-16T22:00:00Z'::timestamptz,
  kickoff_argentina = '2026-06-16T22:00:00Z'::timestamptz,
  kickoff_argentina_display = '16 de jun de 2026 19:00 (Argentina)'
WHERE id = 'i-2'; -- Irak vs Noruega

UPDATE public.matches SET
  kickoff_utc = '2026-06-22T21:00:00Z'::timestamptz,
  kickoff_argentina = '2026-06-22T21:00:00Z'::timestamptz,
  kickoff_argentina_display = '22 de jun de 2026 18:00 (Argentina)'
WHERE id = 'i-3'; -- Francia vs Irak

UPDATE public.matches SET
  kickoff_utc = '2026-06-23T00:00:00Z'::timestamptz,
  kickoff_argentina = '2026-06-23T00:00:00Z'::timestamptz,
  kickoff_argentina_display = '22 de jun de 2026 21:00 (Argentina)'
WHERE id = 'i-4'; -- Noruega vs Senegal

UPDATE public.matches SET
  kickoff_utc = '2026-06-26T19:00:00Z'::timestamptz,
  kickoff_argentina = '2026-06-26T19:00:00Z'::timestamptz,
  kickoff_argentina_display = '26 de jun de 2026 16:00 (Argentina)'
WHERE id = 'i-5'; -- Noruega vs Francia

UPDATE public.matches SET
  kickoff_utc = '2026-06-26T19:00:00Z'::timestamptz,
  kickoff_argentina = '2026-06-26T19:00:00Z'::timestamptz,
  kickoff_argentina_display = '26 de jun de 2026 16:00 (Argentina)'
WHERE id = 'i-6'; -- Senegal vs Irak

UPDATE public.matches SET
  kickoff_utc = '2026-06-17T01:00:00Z'::timestamptz,
  kickoff_argentina = '2026-06-17T01:00:00Z'::timestamptz,
  kickoff_argentina_display = '16 de jun de 2026 22:00 (Argentina)'
WHERE id = 'j-1'; -- Argentina vs Argelia

UPDATE public.matches SET
  kickoff_utc = '2026-06-17T04:00:00Z'::timestamptz,
  kickoff_argentina = '2026-06-17T04:00:00Z'::timestamptz,
  kickoff_argentina_display = '17 de jun de 2026 01:00 (Argentina)'
WHERE id = 'j-2'; -- Austria vs Jordania

UPDATE public.matches SET
  kickoff_utc = '2026-06-22T17:00:00Z'::timestamptz,
  kickoff_argentina = '2026-06-22T17:00:00Z'::timestamptz,
  kickoff_argentina_display = '22 de jun de 2026 14:00 (Argentina)'
WHERE id = 'j-3'; -- Argentina vs Austria

UPDATE public.matches SET
  kickoff_utc = '2026-06-23T03:00:00Z'::timestamptz,
  kickoff_argentina = '2026-06-23T03:00:00Z'::timestamptz,
  kickoff_argentina_display = '23 de jun de 2026 00:00 (Argentina)'
WHERE id = 'j-4'; -- Jordania vs Argelia

UPDATE public.matches SET
  kickoff_utc = '2026-06-28T02:00:00Z'::timestamptz,
  kickoff_argentina = '2026-06-28T02:00:00Z'::timestamptz,
  kickoff_argentina_display = '27 de jun de 2026 23:00 (Argentina)'
WHERE id = 'j-5'; -- Argelia vs Austria

UPDATE public.matches SET
  kickoff_utc = '2026-06-28T02:00:00Z'::timestamptz,
  kickoff_argentina = '2026-06-28T02:00:00Z'::timestamptz,
  kickoff_argentina_display = '27 de jun de 2026 23:00 (Argentina)'
WHERE id = 'j-6'; -- Jordania vs Argentina

UPDATE public.matches SET
  kickoff_utc = '2026-06-17T17:00:00Z'::timestamptz,
  kickoff_argentina = '2026-06-17T17:00:00Z'::timestamptz,
  kickoff_argentina_display = '17 de jun de 2026 14:00 (Argentina)'
WHERE id = 'k-1'; -- Portugal vs RD Congo

UPDATE public.matches SET
  kickoff_utc = '2026-06-18T02:00:00Z'::timestamptz,
  kickoff_argentina = '2026-06-18T02:00:00Z'::timestamptz,
  kickoff_argentina_display = '17 de jun de 2026 23:00 (Argentina)'
WHERE id = 'k-2'; -- Uzbekistán vs Colombia

UPDATE public.matches SET
  kickoff_utc = '2026-06-23T17:00:00Z'::timestamptz,
  kickoff_argentina = '2026-06-23T17:00:00Z'::timestamptz,
  kickoff_argentina_display = '23 de jun de 2026 14:00 (Argentina)'
WHERE id = 'k-3'; -- Portugal vs Uzbekistán

UPDATE public.matches SET
  kickoff_utc = '2026-06-24T02:00:00Z'::timestamptz,
  kickoff_argentina = '2026-06-24T02:00:00Z'::timestamptz,
  kickoff_argentina_display = '23 de jun de 2026 23:00 (Argentina)'
WHERE id = 'k-4'; -- Colombia vs RD Congo

UPDATE public.matches SET
  kickoff_utc = '2026-06-27T23:30:00Z'::timestamptz,
  kickoff_argentina = '2026-06-27T23:30:00Z'::timestamptz,
  kickoff_argentina_display = '27 de jun de 2026 20:30 (Argentina)'
WHERE id = 'k-5'; -- Colombia vs Portugal

UPDATE public.matches SET
  kickoff_utc = '2026-06-27T23:30:00Z'::timestamptz,
  kickoff_argentina = '2026-06-27T23:30:00Z'::timestamptz,
  kickoff_argentina_display = '27 de jun de 2026 20:30 (Argentina)'
WHERE id = 'k-6'; -- RD Congo vs Uzbekistán

UPDATE public.matches SET
  kickoff_utc = '2026-06-17T20:00:00Z'::timestamptz,
  kickoff_argentina = '2026-06-17T20:00:00Z'::timestamptz,
  kickoff_argentina_display = '17 de jun de 2026 17:00 (Argentina)'
WHERE id = 'l-1'; -- Inglaterra vs Croacia

UPDATE public.matches SET
  kickoff_utc = '2026-06-17T23:00:00Z'::timestamptz,
  kickoff_argentina = '2026-06-17T23:00:00Z'::timestamptz,
  kickoff_argentina_display = '17 de jun de 2026 20:00 (Argentina)'
WHERE id = 'l-2'; -- Ghana vs Panamá

UPDATE public.matches SET
  kickoff_utc = '2026-06-23T20:00:00Z'::timestamptz,
  kickoff_argentina = '2026-06-23T20:00:00Z'::timestamptz,
  kickoff_argentina_display = '23 de jun de 2026 17:00 (Argentina)'
WHERE id = 'l-3'; -- Inglaterra vs Ghana

UPDATE public.matches SET
  kickoff_utc = '2026-06-23T23:00:00Z'::timestamptz,
  kickoff_argentina = '2026-06-23T23:00:00Z'::timestamptz,
  kickoff_argentina_display = '23 de jun de 2026 20:00 (Argentina)'
WHERE id = 'l-4'; -- Panamá vs Croacia

UPDATE public.matches SET
  kickoff_utc = '2026-06-27T21:00:00Z'::timestamptz,
  kickoff_argentina = '2026-06-27T21:00:00Z'::timestamptz,
  kickoff_argentina_display = '27 de jun de 2026 18:00 (Argentina)'
WHERE id = 'l-5'; -- Panamá vs Inglaterra

UPDATE public.matches SET
  kickoff_utc = '2026-06-27T21:00:00Z'::timestamptz,
  kickoff_argentina = '2026-06-27T21:00:00Z'::timestamptz,
  kickoff_argentina_display = '27 de jun de 2026 18:00 (Argentina)'
WHERE id = 'l-6'; -- Croacia vs Ghana

notify pgrst, 'reload schema';
