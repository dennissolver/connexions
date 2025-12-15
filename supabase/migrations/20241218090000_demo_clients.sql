create table if not exists demo_agents (
  id uuid primary key default gen_random_uuid(),
  demo_client_id uuid not null references demo_clients(id) on delete cascade,
  name text not null,
  purpose text not null,
  config jsonb not null,
  created_at timestamptz default now()
);

alter table demo_agents enable row level security;
