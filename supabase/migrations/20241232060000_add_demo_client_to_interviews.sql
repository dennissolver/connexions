-- Add demo_client_id to interviews to explicitly link demo sessions
alter table interviews
add column demo_client_id uuid
references demo_clients(id)
on delete cascade;

-- Optional but recommended: index for cleanup & analytics
create index if not exists idx_interviews_demo_client_id
on interviews(demo_client_id);
