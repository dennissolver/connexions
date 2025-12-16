create table if not exists demo_interview_specs (
  id uuid primary key default gen_random_uuid(),

  lead_id uuid not null
    references demo_leads(id)
    on delete cascade,

  interview_type text not null
    check (interview_type in ('interviews', 'survey')),

  goal text not null,
  target_participant text not null,

  duration_mins integer not null
    check (duration_mins > 0),

  questions jsonb not null,
  voice_profile jsonb not null,

  created_at timestamptz not null default now()
);

-- Enable RLS
alter table demo_interview_specs enable row level security;

-- IMPORTANT:
-- PostgreSQL does NOT support "create policy if not exists"
-- so we must drop then recreate to keep this migration idempotent

drop policy if exists "service role full access"
on demo_interview_specs;

create policy "service role full access"
on demo_interview_specs
for all
using (auth.role() = 'service_role');
