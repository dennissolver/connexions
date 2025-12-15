create index if not exists idx_interview_evaluations_agent_created
on interview_evaluations(agent_id, created_at);

create index if not exists idx_interview_evaluations_drift_flag
on interview_evaluations(drift_flag);
