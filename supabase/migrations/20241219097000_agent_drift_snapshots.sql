create table if not exists interview_evaluations (
  id uuid primary key default gen_random_uuid(),

  interview_id uuid not null,
  agent_id uuid,
  agent_version text,

  -- Core scores
  role_adherence_score numeric not null default 0,
  tone_consistency_score numeric not null default 0,
  question_alignment_score numeric not null default 0,
  hallucination_risk_score numeric not null default 0,

  -- Drift
  role_drift_score numeric not null default 0,
  drift_flag boolean not null default false,

  -- Explainability
  summary text,
  issues jsonb,

  -- Prompt lineage
  prompt_key text not null,       -- 'role_drift_eval'
  prompt_version text not null,   -- 'v1.0'

  created_at timestamptz default now()
);
