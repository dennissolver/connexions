-- Interview execution state (system-owned)
create table if not exists interview_state (
  interview_id uuid primary key
    references interviews(id)
    on delete cascade,

  phase text not null
    check (phase in ('intro', 'context', 'core', 'probe', 'wrapup', 'complete')),

  turn_count integer not null default 0,

  answered_questions text[] not null default '{}',
  required_questions text[] not null default '{}',
  optional_questions text[] not null default '{}',

  min_depth_met boolean not null default false,
  completion_ready boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep updated_at current
create or replace function touch_interview_state_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_touch_interview_state
before update on interview_state
for each row
execute function touch_interview_state_updated_at();
