-- Ganador por penales en fase eliminatoria (empate 90'/120' → winner_team manual).
-- Idempotente: correr en producción sin borrar resultados existentes.

alter table public.results
  add column if not exists winner_team text,
  add column if not exists decided_by text;

alter table public.results drop constraint if exists results_decided_by_check;
alter table public.results
  add constraint results_decided_by_check
  check (decided_by is null or decided_by in ('regular', 'penalties'));
