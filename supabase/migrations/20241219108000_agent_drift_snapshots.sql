create table if not exists agent_drift_snapshots (
  id uuid primary key default gen_random_uuid(),

  agent_id uuid not null,

  window_start timestamptz not null,
  window_end timestamptz not null,

  avg_role_drift_score numeric,
  drift_event_count integer,

  created_at timestamptz default now()
);
