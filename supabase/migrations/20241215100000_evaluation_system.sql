-- ============================================================================
-- AI INTERVIEW AGENTS - EVALUATION SYSTEM
-- Tracks performance metrics for every interviews, enables drill-down analysis
-- ============================================================================

-- ============================================================================
-- INTERVIEW EVALUATIONS (One per interviews)
-- ============================================================================
CREATE TABLE IF NOT EXISTS interview_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID REFERENCES interviews(id) ON DELETE CASCADE NOT NULL,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,

  -- Overall Scores (0-100)
  overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),

  -- Category Scores (0-100 each)
  goal_achievement_score INTEGER CHECK (goal_achievement_score >= 0 AND goal_achievement_score <= 100),
  conversation_quality_score INTEGER CHECK (conversation_quality_score >= 0 AND conversation_quality_score <= 100),
  user_engagement_score INTEGER CHECK (user_engagement_score >= 0 AND user_engagement_score <= 100),
  prompt_adherence_score INTEGER CHECK (prompt_adherence_score >= 0 AND prompt_adherence_score <= 100),

  -- Detailed Metrics
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  /*
    Expected structure:
    {
      "goal_achievement": {
        "topics_covered": ["topic1", "topic2"],
        "topics_missed": ["topic3"],
        "coverage_percentage": 75,
        "key_insights_extracted": 5
      },
      "conversation_quality": {
        "follow_up_quality": 85,
        "question_relevance": 90,
        "response_appropriateness": 88,
        "conversation_flow": 82
      },
      "user_engagement": {
        "response_length_avg": 45,
        "engagement_trend": "increasing",
        "dropout_risk_detected": false,
        "sentiment_progression": ["neutral", "positive", "positive"]
      },
      "prompt_adherence": {
        "tone_match": 92,
        "stayed_on_topic": true,
        "followed_constraints": true,
        "used_appropriate_style": true
      }
    }
  */

  -- Issues Detected
  issues JSONB DEFAULT '[]'::jsonb,
  /*
    Expected structure:
    [
      {
        "id": "uuid",
        "type": "goal_missed" | "off_topic" | "tone_violation" | "engagement_drop" | "technical_error",
        "severity": "critical" | "warning" | "info",
        "message": "Agent failed to ask about budget constraints",
        "timestamp_seconds": 245,
        "context": "User mentioned they have limited resources but agent didn't follow up"
      }
    ]
  */

  -- Recommendations
  recommendations JSONB DEFAULT '[]'::jsonb,
  /*
    [
      {
        "type": "prompt_improvement",
        "priority": "high",
        "suggestion": "Add explicit instruction to probe on budget/resources",
        "expected_impact": "Should improve goal achievement by ~15%"
      }
    ]
  */

  -- Raw Analysis
  transcript_summary TEXT,
  key_moments JSONB DEFAULT '[]'::jsonb,

  -- Evaluation Metadata
  eval_model TEXT DEFAULT 'claude-sonnet-4-20250514',
  eval_duration_ms INTEGER,
  eval_version TEXT DEFAULT 'v1.0',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- AGENT PERFORMANCE SNAPSHOTS (Daily aggregates per agent)
-- ============================================================================
CREATE TABLE IF NOT EXISTS agent_performance_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  snapshot_date DATE NOT NULL,

  -- Interview Counts
  total_interviews INTEGER NOT NULL DEFAULT 0,
  completed_interviews INTEGER NOT NULL DEFAULT 0,

  -- Aggregate Scores (averages)
  avg_overall_score DECIMAL(5,2),
  avg_goal_achievement DECIMAL(5,2),
  avg_conversation_quality DECIMAL(5,2),
  avg_user_engagement DECIMAL(5,2),
  avg_prompt_adherence DECIMAL(5,2),

  -- Score Distribution
  score_distribution JSONB DEFAULT '{}'::jsonb,
  /*
    {
      "excellent": 10,    // 90-100
      "good": 25,         // 70-89
      "needs_improvement": 5,  // 50-69
      "poor": 2           // 0-49
    }
  */

  -- Issue Summary
  issue_counts JSONB DEFAULT '{}'::jsonb,
  /*
    {
      "goal_missed": 5,
      "off_topic": 2,
      "tone_violation": 1,
      "engagement_drop": 3
    }
  */

  -- Top Issues (most frequent)
  top_issues JSONB DEFAULT '[]'::jsonb,

  -- Trends
  score_trend TEXT CHECK (score_trend IN ('improving', 'stable', 'declining')),
  trend_percentage DECIMAL(5,2), -- e.g., +5.2% or -3.1%

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(agent_id, snapshot_date)
);

-- ============================================================================
-- PLATFORM PERFORMANCE (Global aggregates across all agents)
-- ============================================================================
CREATE TABLE IF NOT EXISTS platform_performance_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL UNIQUE,

  -- Totals
  total_agents INTEGER NOT NULL DEFAULT 0,
  active_agents INTEGER NOT NULL DEFAULT 0,
  total_interviews INTEGER NOT NULL DEFAULT 0,
  total_evaluations INTEGER NOT NULL DEFAULT 0,

  -- Platform-wide Scores
  platform_avg_score DECIMAL(5,2),

  -- Top/Bottom Performers
  top_performing_agents JSONB DEFAULT '[]'::jsonb,
  underperforming_agents JSONB DEFAULT '[]'::jsonb,

  -- Common Issues Across Platform
  platform_issue_summary JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- EVALUATION ALERTS (Real-time notifications for critical issues)
-- ============================================================================
CREATE TABLE IF NOT EXISTS evaluation_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  interview_id UUID REFERENCES interviews(id) ON DELETE CASCADE,
  evaluation_id UUID REFERENCES interview_evaluations(id) ON DELETE CASCADE,

  -- Alert Details
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'score_drop',           -- Sudden score decrease
    'repeated_issue',       -- Same issue 3+ times
    'critical_failure',     -- Score below threshold
    'engagement_crisis',    -- Multiple dropouts
    'system_error'          -- Technical failures
  )),
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,

  -- Context
  context JSONB DEFAULT '{}'::jsonb,

  -- Resolution
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved', 'dismissed')),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_eval_interview_id ON interview_evaluations(interview_id);
CREATE INDEX IF NOT EXISTS idx_eval_agent_id ON interview_evaluations(agent_id);
CREATE INDEX IF NOT EXISTS idx_eval_created_at ON interview_evaluations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_eval_overall_score ON interview_evaluations(overall_score);

CREATE INDEX IF NOT EXISTS idx_perf_agent_date ON agent_performance_snapshots(agent_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_platform_date ON platform_performance_snapshots(snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_alerts_agent ON evaluation_alerts(agent_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON evaluation_alerts(status) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON evaluation_alerts(severity, created_at DESC);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to calculate agent health status
CREATE OR REPLACE FUNCTION get_agent_health_status(p_agent_id UUID)
RETURNS TABLE (
  status TEXT,
  score DECIMAL,
  trend TEXT,
  open_alerts INTEGER,
  last_eval_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  WITH recent_evals AS (
    SELECT
      overall_score,
      created_at
    FROM interview_evaluations
    WHERE agent_id = p_agent_id
    ORDER BY created_at DESC
    LIMIT 10
  ),
  avg_score AS (
    SELECT COALESCE(AVG(overall_score), 0) as score FROM recent_evals
  ),
  alerts AS (
    SELECT COUNT(*) as cnt FROM evaluation_alerts
    WHERE agent_id = p_agent_id AND status = 'open'
  )
  SELECT
    CASE
      WHEN (SELECT score FROM avg_score) >= 80 THEN 'healthy'
      WHEN (SELECT score FROM avg_score) >= 60 THEN 'needs_attention'
      ELSE 'critical'
    END as status,
    (SELECT score FROM avg_score)::DECIMAL as score,
    COALESCE(
      (SELECT score_trend FROM agent_performance_snapshots
       WHERE agent_id = p_agent_id
       ORDER BY snapshot_date DESC LIMIT 1),
      'stable'
    ) as trend,
    (SELECT cnt FROM alerts)::INTEGER as open_alerts,
    (SELECT MAX(created_at) FROM recent_evals) as last_eval_at;
END;
$$ LANGUAGE plpgsql;

-- Function to aggregate daily performance
CREATE OR REPLACE FUNCTION aggregate_daily_performance(p_date DATE DEFAULT CURRENT_DATE)
RETURNS void AS $$
BEGIN
  -- Aggregate per agent
  INSERT INTO agent_performance_snapshots (
    agent_id,
    snapshot_date,
    total_interviews,
    completed_interviews,
    avg_overall_score,
    avg_goal_achievement,
    avg_conversation_quality,
    avg_user_engagement,
    avg_prompt_adherence,
    score_distribution,
    issue_counts
  )
  SELECT
    e.agent_id,
    p_date,
    COUNT(DISTINCT e.interview_id),
    COUNT(DISTINCT e.interview_id) FILTER (WHERE i.status = 'completed'),
    AVG(e.overall_score),
    AVG(e.goal_achievement_score),
    AVG(e.conversation_quality_score),
    AVG(e.user_engagement_score),
    AVG(e.prompt_adherence_score),
    jsonb_build_object(
      'excellent', COUNT(*) FILTER (WHERE e.overall_score >= 90),
      'good', COUNT(*) FILTER (WHERE e.overall_score >= 70 AND e.overall_score < 90),
      'needs_improvement', COUNT(*) FILTER (WHERE e.overall_score >= 50 AND e.overall_score < 70),
      'poor', COUNT(*) FILTER (WHERE e.overall_score < 50)
    ),
    '{}'::jsonb
  FROM interview_evaluations e
  JOIN interviews i ON e.interview_id = i.id
  WHERE e.created_at::DATE = p_date
  GROUP BY e.agent_id
  ON CONFLICT (agent_id, snapshot_date)
  DO UPDATE SET
    total_interviews = EXCLUDED.total_interviews,
    completed_interviews = EXCLUDED.completed_interviews,
    avg_overall_score = EXCLUDED.avg_overall_score,
    avg_goal_achievement = EXCLUDED.avg_goal_achievement,
    avg_conversation_quality = EXCLUDED.avg_conversation_quality,
    avg_user_engagement = EXCLUDED.avg_user_engagement,
    avg_prompt_adherence = EXCLUDED.avg_prompt_adherence,
    score_distribution = EXCLUDED.score_distribution;

  -- Aggregate platform-wide
  INSERT INTO platform_performance_snapshots (
    snapshot_date,
    total_agents,
    active_agents,
    total_interviews,
    total_evaluations,
    platform_avg_score
  )
  SELECT
    p_date,
    (SELECT COUNT(*) FROM agents),
    COUNT(DISTINCT e.agent_id),
    COUNT(DISTINCT e.interview_id),
    COUNT(*),
    AVG(e.overall_score)
  FROM interview_evaluations e
  WHERE e.created_at::DATE = p_date
  ON CONFLICT (snapshot_date)
  DO UPDATE SET
    total_interviews = EXCLUDED.total_interviews,
    total_evaluations = EXCLUDED.total_evaluations,
    platform_avg_score = EXCLUDED.platform_avg_score,
    active_agents = EXCLUDED.active_agents;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================
ALTER TABLE interview_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_performance_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_alerts ENABLE ROW LEVEL SECURITY;

-- Evaluations: Clients can view evaluations for their agents
CREATE POLICY "Clients view own evaluations" ON interview_evaluations
  FOR SELECT USING (
    agent_id IN (SELECT id FROM agents WHERE client_id = auth.uid())
  );

-- Performance: Clients can view performance for their agents
CREATE POLICY "Clients view own performance" ON agent_performance_snapshots
  FOR SELECT USING (
    agent_id IN (SELECT id FROM agents WHERE client_id = auth.uid())
  );

-- Alerts: Clients can view/update alerts for their agents
CREATE POLICY "Clients view own alerts" ON evaluation_alerts
  FOR SELECT USING (
    agent_id IN (SELECT id FROM agents WHERE client_id = auth.uid())
  );

CREATE POLICY "Clients update own alerts" ON evaluation_alerts
  FOR UPDATE USING (
    agent_id IN (SELECT id FROM agents WHERE client_id = auth.uid())
  );

-- Service role can do everything (for eval runner)
CREATE POLICY "Service role full access evals" ON interview_evaluations
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access perf" ON agent_performance_snapshots
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access alerts" ON evaluation_alerts
  FOR ALL USING (auth.role() = 'service_role');