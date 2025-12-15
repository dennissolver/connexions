create or replace function snapshot_agent_drift(p_date date)
returns void
language plpgsql
as $$
begin
  insert into agent_drift_snapshots (
    agent_id,
    snapshot_date,
    avg_drift_score,
    max_drift_score,
    interviews_count,
    drift_flagged_count
  )
  select
    agent_id,
    p_date,
    avg(role_drift_score),
    max(role_drift_score),
    count(*),
    sum(case when drift_flag = true then 1 else 0 end)
  from interview_evaluations
  where date_trunc('day', created_at)::date = p_date
  group by agent_id
  on conflict (agent_id, snapshot_date) do nothing;
end;
$$;
