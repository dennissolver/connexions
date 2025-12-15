create table if not exists agent_drift_snapshots (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents(id) on delete cascade,
  snapshot_date date not null,
  avg_drift_score numeric not null,
  max_drift_score numeric not null,
  interviews_count integer not null,
  drift_flagged_count integer not null,
  created_at timestamptz default now(),
  unique (agent_id, snapshot_date)
);

create index if not exists idx_agent_drift_snapshots_agent_date
  on agent_drift_snapshots(agent_id, snapshot_date);
