-- Add role drift evaluation fields

alter table if exists public.evaluations
add column if not exists role_drift_score numeric default 0;

alter table if exists public.evaluations
add column if not exists drift_flag boolean default false;
