create or replace view agent_drift_daily as
select
  agent_id,
  date_trunc('day', created_at)::date as day,
  avg(role_drift_score) as avg_drift_score,
  max(role_drift_score) as max_drift_score,
  count(*) as interview_count,
  sum(case when drift_flag = true then 1 else 0 end) as drift_flagged_count
from interview_evaluations
group by agent_id, day;
