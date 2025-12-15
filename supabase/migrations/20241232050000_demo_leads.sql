-- Create demo leads table for Connexions marketing → demo flow

create table if not exists demo_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  company text,
  use_case text,
  created_at timestamptz not null default now()
);

-- Enable Row Level Security
alter table demo_leads enable row level security;

-- Allow public inserts from landing page demo form
create policy "Allow public demo lead inserts"
on demo_leads
for insert
to anon
with check (true);
