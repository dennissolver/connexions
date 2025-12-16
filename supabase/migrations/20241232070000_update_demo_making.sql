create table demo_interview_specs (
  id uuid primary key default gen_random_uuid(),

  lead_id uuid not null
    references demo_leads(id)
    on delete cascade,

  agent_id uuid not null
    references agents(id)
    on delete restrict,

  spec jsonb not null,

  created_at timestamptz not null default now(),

  -- ensures one final spec per demo session
  unique (lead_id)
);

