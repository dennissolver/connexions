-- ============================
-- BILLING ACCOUNT
-- ============================

create table if not exists billing_accounts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null,
  plan text not null default 'factory',
  monthly_included_interviews int not null default 200,
  created_at timestamptz default now()
);

-- ============================
-- USAGE LEDGER (per interviewee)
-- ============================

create table if not exists usage_ledger (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null,
  interview_id uuid not null,
  occurred_at timestamptz default now()
);

-- ============================
-- DEMO INTERVIEW MARKER
-- ============================

alter table interviews
add column if not exists is_demo boolean default false;

-- ============================
-- RLS
-- ============================

alter table billing_accounts enable row level security;
alter table usage_ledger enable row level security;

-- Service role only (factory controlled)
create policy "service role only billing"
on billing_accounts
for all
using (auth.role() = 'service_role');

create policy "service role only usage"
on usage_ledger
for all
using (auth.role() = 'service_role');

