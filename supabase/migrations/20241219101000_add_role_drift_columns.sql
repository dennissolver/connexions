alter table interview_evaluations
add column if not exists role_drift_score numeric default 0;

alter table interview_evaluations
add column if not exists drift_flag boolean default false;
