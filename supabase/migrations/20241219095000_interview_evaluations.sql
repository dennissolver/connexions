create table if not exists prompt_versions (
  id uuid primary key default gen_random_uuid(),
  prompt_key text not null,          -- e.g. 'role_drift_eval'
  version text not null,             -- e.g. 'v1.0'
  description text,
  file_path text not null,           -- e.g. 'lib/prompts/evaluation/system.role_drift.v1.md'
  is_active boolean default true,
  created_at timestamptz default now(),
  unique (prompt_key, version)
);
