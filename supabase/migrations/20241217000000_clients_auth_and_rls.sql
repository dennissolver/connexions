-- ============================
-- CLIENTS (TENANTS)
-- ============================

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

-- ============================
-- CLIENT ↔ USER MEMBERSHIP
-- ============================

create table if not exists client_users (
  user_id uuid references auth.users(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member')),
  created_at timestamptz default now(),
  primary key (user_id, client_id)
);

-- ============================
-- AGENTS: ENSURE CLIENT OWNERSHIP
-- ============================

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_name = 'agents'
      and column_name = 'client_id'
  ) then
    alter table agents
      add column client_id uuid references clients(id);
  end if;
end $$;

-- ============================
-- ENABLE ROW LEVEL SECURITY
-- ============================

alter table clients enable row level security;
alter table client_users enable row level security;
alter table agents enable row level security;

-- ============================
-- RLS: CLIENT VISIBILITY
-- ============================

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'clients'
      and policyname = 'clients_select_own'
  ) then
    create policy clients_select_own
      on clients
      for select
      using (
        exists (
          select 1
          from client_users
          where client_users.user_id = auth.uid()
            and client_users.client_id = clients.id
        )
      );
  end if;
end $$;

-- ============================
-- RLS: CLIENT_USERS VISIBILITY
-- ============================

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'client_users'
      and policyname = 'client_users_select_own'
  ) then
    create policy client_users_select_own
      on client_users
      for select
      using (client_users.user_id = auth.uid());
  end if;
end $$;

-- ============================
-- RLS: AGENTS VISIBILITY
-- ============================

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'agents'
      and policyname = 'agents_select_by_client'
  ) then
    create policy agents_select_by_client
      on agents
      for select
      using (
        exists (
          select 1
          from client_users
          where client_users.user_id = auth.uid()
            and client_users.client_id = agents.client_id
        )
      );
  end if;
end $$;

