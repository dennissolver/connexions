ALTER TABLE agents
ADD COLUMN agent_config JSONB;

ALTER TABLE interview_evaluations
ADD COLUMN role_adherence_score INTEGER,
ADD COLUMN role_adherence_analysis JSONB;

CREATE TABLE role_adherence_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  interview_id UUID REFERENCES interviews(id) ON DELETE CASCADE,
  role_adherence_score INTEGER NOT NULL,
  deviation_signals JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
