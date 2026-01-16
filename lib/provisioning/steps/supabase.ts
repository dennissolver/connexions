// lib/provisioning/steps/supabase.ts

import { ProvisionContext, ProvisionStepResult } from '../types';

const SUPABASE_API = 'https://api.supabase.com/v1';

// ============================================================================
// COMPLETE CHILD PLATFORM SCHEMA
// ============================================================================
// Includes:
// - Core tables (agents, interviews, transcripts, etc.)
// - Interview evaluations (per-interview AI analysis)
// - Panel insights (aggregated analysis)
// - AI analyst (conversational queries)
// - Reports & exports
// - Quality monitoring & alerts
// ============================================================================

const CHILD_SCHEMA = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Platform configuration (single row for platform settings)
CREATE TABLE IF NOT EXISTS platforms (
  id INT PRIMARY KEY DEFAULT 1,
  name TEXT,
  company_name TEXT,
  vercel_url TEXT,
  supabase_url TEXT,
  elevenlabs_agent_id TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO platforms (id, name) VALUES (1, 'Platform') ON CONFLICT (id) DO NOTHING;

-- Agents/Panels table (research studies)
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT DEFAULT '',
  status TEXT DEFAULT 'active',
  interview_type TEXT,
  interview_context TEXT CHECK (interview_context IN ('B2B', 'B2C')),
  agent_name TEXT DEFAULT 'Alex',
  voice_gender TEXT DEFAULT 'female',
  greeting TEXT DEFAULT '',
  questions JSONB DEFAULT '[]',
  company_name TEXT,
  interview_purpose TEXT,
  target_interviewees TEXT,
  interviewer_tone TEXT DEFAULT 'professional',
  estimated_duration_mins INT DEFAULT 10,
  elevenlabs_agent_id TEXT,
  voice_id TEXT,
  key_topics TEXT[],
  key_questions TEXT[],
  constraints TEXT[],
  system_prompt TEXT,
  first_message TEXT,
  welcome_message TEXT,
  closing_message TEXT,
  primary_color TEXT DEFAULT '#8B5CF6',
  background_color TEXT DEFAULT '#0F172A',
  logo_url TEXT,
  total_interviews INT DEFAULT 0,
  completed_interviews INT DEFAULT 0,
  avg_duration_seconds INT,
  avg_score NUMERIC,
  settings JSONB DEFAULT '{}',
  archived BOOLEAN DEFAULT FALSE,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable real-time for agents table (required for draft detection)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'agents'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE agents;
  END IF;
END $$;

-- Panel drafts table (Sandra conversation outputs before publishing)
CREATE TABLE IF NOT EXISTS panel_drafts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  research_goal TEXT,
  target_audience TEXT,
  interview_type TEXT DEFAULT '',
  interview_context TEXT CHECK (interview_context IN ('B2B', 'B2C')),
  tone TEXT DEFAULT 'professional',
  duration_minutes INTEGER DEFAULT 15,
  questions JSONB DEFAULT '[]'::jsonb,
  agent_name TEXT,
  voice_gender TEXT CHECK (voice_gender IN ('male', 'female')),
  company_name TEXT,
  conversation_id TEXT,
  elevenlabs_conversation_id TEXT,
  setup_conversation_id TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'published', 'discarded')),
  published_panel_id UUID,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interviewees table (invited participants)
CREATE TABLE IF NOT EXISTS interviewees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  panel_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  phone TEXT,
  company TEXT,
  custom_field TEXT,
  custom_data JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  invite_token TEXT UNIQUE,
  source TEXT,
  status TEXT DEFAULT 'pending',
  invited_at TIMESTAMPTZ,
  reminded_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  interview_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interviews table (actual interview sessions)
CREATE TABLE IF NOT EXISTS interviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  panel_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  interviewee_id UUID REFERENCES interviewees(id) ON DELETE SET NULL,
  elevenlabs_agent_id TEXT,
  elevenlabs_conversation_id TEXT UNIQUE,
  status TEXT DEFAULT 'pending',
  source TEXT DEFAULT 'voice',
  interviewee_name TEXT,
  interviewee_email TEXT,
  interviewee_profile JSONB DEFAULT '{}',
  participant_name TEXT,
  participant_company TEXT,
  participant_country TEXT,
  participant_city TEXT,
  participant_investment_stage TEXT,
  participant_sectors TEXT,
  conversation_id TEXT,
  messages JSONB DEFAULT '[]',
  transcript TEXT,
  transcript_url TEXT,
  audio_url TEXT,
  transcript_received BOOLEAN DEFAULT FALSE,
  summary TEXT,
  feedback JSONB DEFAULT '{}',
  extracted_data JSONB DEFAULT '{}',
  word_count INT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_seconds INT,
  metadata JSONB DEFAULT '{}',
  -- Evaluation tracking
  evaluated BOOLEAN DEFAULT FALSE,
  evaluated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Setup conversations (Sandra panel creation)
CREATE TABLE IF NOT EXISTS setup_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  elevenlabs_conversation_id TEXT UNIQUE,
  elevenlabs_agent_id TEXT,
  panel_created_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  panel_draft_id UUID REFERENCES panel_drafts(id) ON DELETE SET NULL,
  transcript_text TEXT,
  transcript_json JSONB,
  analysis JSONB,
  extracted_panel_data JSONB,
  metadata JSONB,
  status TEXT,
  call_duration_seconds INT,
  conversation_started_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interview transcripts (detailed storage from webhook)
CREATE TABLE IF NOT EXISTS interview_transcripts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  elevenlabs_conversation_id TEXT UNIQUE,
  elevenlabs_agent_id TEXT,
  interview_id UUID REFERENCES interviews(id) ON DELETE SET NULL,
  panel_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  interviewee_id UUID REFERENCES interviewees(id) ON DELETE SET NULL,
  participant_name TEXT,
  participant_company TEXT,
  participant_city TEXT,
  transcript_text TEXT,
  transcript JSONB,
  analysis JSONB,
  summary TEXT,
  metadata JSONB,
  status TEXT,
  call_duration_seconds INT,
  word_count INT,
  questions_answers JSONB,
  key_insights JSONB,
  conversation_started_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  forwarded_to_parent BOOLEAN DEFAULT FALSE,
  forwarded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- EVALUATION & INSIGHTS TABLES
-- ============================================================================

-- Per-interview AI evaluation (sentiment, themes, quotes, etc.)
CREATE TABLE IF NOT EXISTS interview_evaluations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  interview_id UUID REFERENCES interviews(id) ON DELETE CASCADE UNIQUE,
  transcript_id UUID REFERENCES interview_transcripts(id) ON DELETE CASCADE,
  panel_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  
  -- Summary
  summary TEXT,
  executive_summary TEXT,
  
  -- Sentiment
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative', 'mixed')),
  sentiment_score DECIMAL(3,2) CHECK (sentiment_score >= -1 AND sentiment_score <= 1),
  sentiment_reasoning TEXT,
  
  -- Quality
  quality_score INTEGER CHECK (quality_score >= 0 AND quality_score <= 100),
  quality_reasoning TEXT,
  engagement_level TEXT CHECK (engagement_level IN ('high', 'medium', 'low')),
  
  -- Extracted insights
  key_quotes JSONB DEFAULT '[]',
  topics JSONB DEFAULT '[]',
  pain_points JSONB DEFAULT '[]',
  desires JSONB DEFAULT '[]',
  surprises JSONB DEFAULT '[]',
  
  -- Flags
  follow_up_worthy BOOLEAN DEFAULT FALSE,
  follow_up_reason TEXT,
  needs_review BOOLEAN DEFAULT FALSE,
  review_reason TEXT,
  
  -- Question-level analysis
  question_responses JSONB DEFAULT '[]',
  
  -- Metadata
  model_used TEXT,
  prompt_version TEXT,
  raw_response JSONB,
  tokens_used INTEGER,
  evaluation_duration_ms INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Panel-level aggregated insights
CREATE TABLE IF NOT EXISTS panel_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  panel_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  
  -- Counts at time of generation
  interview_count INTEGER,
  evaluated_count INTEGER,
  
  -- Sentiment aggregation
  avg_sentiment_score DECIMAL(3,2),
  sentiment_breakdown JSONB,
  sentiment_trend JSONB,
  
  -- Quality aggregation
  avg_quality_score DECIMAL(5,2),
  quality_distribution JSONB,
  
  -- Theme analysis
  top_themes JSONB,
  theme_correlations JSONB,
  
  -- Pain points & desires aggregation
  common_pain_points JSONB,
  common_desires JSONB,
  
  -- Key quotes (curated)
  curated_quotes JSONB,
  
  -- Word frequency (for word clouds)
  word_frequency JSONB,
  
  -- Outliers
  outlier_interviews JSONB,
  
  -- AI-generated summaries
  executive_summary TEXT,
  key_findings JSONB,
  recommendations JSONB,
  
  -- Comparisons
  segment_comparisons JSONB,
  
  -- Generation metadata
  model_used TEXT,
  prompt_version TEXT,
  generation_duration_ms INTEGER,
  
  -- Validity
  valid_until TIMESTAMPTZ,
  stale BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- AI ANALYST TABLES
-- ============================================================================

-- Analyst chat sessions
CREATE TABLE IF NOT EXISTS analyst_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  panel_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  user_id UUID,
  title TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ
);

-- Analyst chat messages
CREATE TABLE IF NOT EXISTS analyst_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES analyst_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  context_interviews JSONB,
  context_token_count INTEGER,
  citations JSONB,
  model_used TEXT,
  tokens_used INTEGER,
  response_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Saved analyst queries (templates/favorites)
CREATE TABLE IF NOT EXISTS analyst_saved_queries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  panel_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  user_id UUID,
  name TEXT NOT NULL,
  query TEXT NOT NULL,
  description TEXT,
  category TEXT,
  use_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- EXPORT & REPORTS TABLES
-- ============================================================================

-- Generated reports
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  panel_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  user_id UUID,
  title TEXT NOT NULL,
  report_type TEXT CHECK (report_type IN ('executive', 'detailed', 'quotes', 'custom')),
  sections JSONB,
  filters JSONB,
  content JSONB,
  pdf_url TEXT,
  pptx_url TEXT,
  docx_url TEXT,
  status TEXT DEFAULT 'generating' CHECK (status IN ('generating', 'ready', 'failed', 'expired')),
  generation_duration_ms INTEGER,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Export history
CREATE TABLE IF NOT EXISTS exports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  panel_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  user_id UUID,
  export_type TEXT CHECK (export_type IN ('csv', 'json', 'xlsx', 'transcripts_zip')),
  record_count INTEGER,
  filters JSONB,
  columns JSONB,
  file_url TEXT,
  file_size_bytes INTEGER,
  status TEXT DEFAULT 'generating' CHECK (status IN ('generating', 'ready', 'failed', 'expired')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- QUALITY & MONITORING TABLES
-- ============================================================================

-- Alerts/notifications
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  panel_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  interview_id UUID REFERENCES interviews(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  description TEXT,
  context JSONB,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'viewed', 'acknowledged', 'resolved', 'dismissed')),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Panel health snapshots
CREATE TABLE IF NOT EXISTS panel_health_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  panel_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  total_interviews INTEGER,
  completed_interviews INTEGER,
  evaluated_interviews INTEGER,
  avg_duration_seconds INTEGER,
  avg_quality_score DECIMAL(5,2),
  avg_sentiment_score DECIMAL(3,2),
  completion_rate DECIMAL(5,2),
  open_alerts INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(panel_id, snapshot_date)
);

-- ============================================================================
-- SUPPORTING TABLES
-- ============================================================================

-- Webhook logs
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source TEXT,
  event_type TEXT,
  payload JSONB,
  status TEXT,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email logs
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient TEXT,
  subject TEXT,
  template TEXT,
  status TEXT,
  error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dead letter events (failed processing)
CREATE TABLE IF NOT EXISTS dead_letter_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT,
  payload JSONB,
  error TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Processed events (deduplication)
CREATE TABLE IF NOT EXISTS processed_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id TEXT UNIQUE,
  event_type TEXT,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Core indexes
CREATE INDEX IF NOT EXISTS idx_agents_slug ON agents(slug);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_interviews_agent_id ON interviews(agent_id);
CREATE INDEX IF NOT EXISTS idx_interviews_panel_id ON interviews(panel_id);
CREATE INDEX IF NOT EXISTS idx_interviews_status ON interviews(status);
CREATE INDEX IF NOT EXISTS idx_interviews_elevenlabs_conv ON interviews(elevenlabs_conversation_id);
CREATE INDEX IF NOT EXISTS idx_interviews_evaluated ON interviews(evaluated) WHERE evaluated = FALSE;
CREATE INDEX IF NOT EXISTS idx_interviewees_panel_id ON interviewees(panel_id);
CREATE INDEX IF NOT EXISTS idx_interviewees_email ON interviewees(email);
CREATE INDEX IF NOT EXISTS idx_interview_transcripts_conversation ON interview_transcripts(elevenlabs_conversation_id);
CREATE INDEX IF NOT EXISTS idx_interview_transcripts_panel ON interview_transcripts(panel_id);
CREATE INDEX IF NOT EXISTS idx_setup_conversations_conversation ON setup_conversations(elevenlabs_conversation_id);
CREATE INDEX IF NOT EXISTS idx_panel_drafts_status ON panel_drafts(status);
CREATE INDEX IF NOT EXISTS idx_panel_drafts_conversation_id ON panel_drafts(conversation_id);

-- Evaluation indexes
CREATE INDEX IF NOT EXISTS idx_interview_evaluations_interview ON interview_evaluations(interview_id);
CREATE INDEX IF NOT EXISTS idx_interview_evaluations_panel ON interview_evaluations(panel_id);
CREATE INDEX IF NOT EXISTS idx_interview_evaluations_sentiment ON interview_evaluations(sentiment);
CREATE INDEX IF NOT EXISTS idx_interview_evaluations_quality ON interview_evaluations(quality_score);
CREATE INDEX IF NOT EXISTS idx_interview_evaluations_follow_up ON interview_evaluations(follow_up_worthy) WHERE follow_up_worthy = TRUE;

-- Panel insights indexes
CREATE INDEX IF NOT EXISTS idx_panel_insights_panel ON panel_insights(panel_id);
CREATE INDEX IF NOT EXISTS idx_panel_insights_stale ON panel_insights(stale) WHERE stale = TRUE;

-- Analyst indexes
CREATE INDEX IF NOT EXISTS idx_analyst_sessions_panel ON analyst_sessions(panel_id);
CREATE INDEX IF NOT EXISTS idx_analyst_messages_session ON analyst_messages(session_id);

-- Alert indexes
CREATE INDEX IF NOT EXISTS idx_alerts_panel ON alerts(panel_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status) WHERE status = 'new';

-- Time-based indexes
CREATE INDEX IF NOT EXISTS idx_interviews_created ON interviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interview_evaluations_created ON interview_evaluations(created_at DESC);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Update agent interview counts
CREATE OR REPLACE FUNCTION update_agent_interview_counts()
RETURNS TRIGGER AS $$
DECLARE
  target_panel_id UUID;
BEGIN
  target_panel_id := COALESCE(NEW.panel_id, OLD.panel_id);
  
  IF target_panel_id IS NOT NULL THEN
    UPDATE agents SET
      total_interviews = (SELECT COUNT(*) FROM interviews WHERE panel_id = target_panel_id),
      completed_interviews = (SELECT COUNT(*) FROM interviews WHERE panel_id = target_panel_id AND status = 'completed'),
      updated_at = NOW()
    WHERE id = target_panel_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_agent_counts ON interviews;
CREATE TRIGGER trg_update_agent_counts
AFTER INSERT OR UPDATE OR DELETE ON interviews
FOR EACH ROW EXECUTE FUNCTION update_agent_interview_counts();

-- Mark panel insights as stale when new evaluation added
CREATE OR REPLACE FUNCTION mark_panel_insights_stale()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE panel_insights SET stale = TRUE, updated_at = NOW()
  WHERE panel_id = NEW.panel_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_mark_insights_stale ON interview_evaluations;
CREATE TRIGGER trg_mark_insights_stale
AFTER INSERT ON interview_evaluations
FOR EACH ROW EXECUTE FUNCTION mark_panel_insights_stale();

-- Generic updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS trg_agents_updated ON agents;
CREATE TRIGGER trg_agents_updated BEFORE UPDATE ON agents
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_panel_drafts_updated ON panel_drafts;
CREATE TRIGGER trg_panel_drafts_updated BEFORE UPDATE ON panel_drafts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_interviews_updated ON interviews;
CREATE TRIGGER trg_interviews_updated BEFORE UPDATE ON interviews
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_interview_evaluations_updated ON interview_evaluations;
CREATE TRIGGER trg_interview_evaluations_updated BEFORE UPDATE ON interview_evaluations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_panel_insights_updated ON panel_insights;
CREATE TRIGGER trg_panel_insights_updated BEFORE UPDATE ON panel_insights
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_analyst_sessions_updated ON analyst_sessions;
CREATE TRIGGER trg_analyst_sessions_updated BEFORE UPDATE ON analyst_sessions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_reports_updated ON reports;
CREATE TRIGGER trg_reports_updated BEFORE UPDATE ON reports
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Interview summary view (for dashboard list)
CREATE OR REPLACE VIEW v_interview_summary AS
SELECT 
  i.id,
  i.panel_id,
  a.name as panel_name,
  i.participant_name,
  i.participant_company,
  COALESCE(i.participant_country, i.participant_city, t.participant_city) as participant_location,
  i.status,
  i.duration_seconds,
  i.completed_at,
  i.evaluated,
  e.summary,
  e.sentiment,
  e.sentiment_score,
  e.quality_score,
  e.follow_up_worthy,
  e.topics,
  e.key_quotes
FROM interviews i
LEFT JOIN agents a ON i.panel_id = a.id
LEFT JOIN interview_transcripts t ON i.elevenlabs_conversation_id = t.elevenlabs_conversation_id
LEFT JOIN interview_evaluations e ON i.id = e.interview_id;

-- Panel overview view (for dashboard cards)
CREATE OR REPLACE VIEW v_panel_overview AS
SELECT 
  a.id,
  a.name,
  a.status,
  a.total_interviews as interview_count,
  a.completed_interviews as completed_count,
  a.created_at,
  COALESCE(stats.avg_quality, 0) as avg_quality,
  COALESCE(stats.avg_sentiment, 0) as avg_sentiment,
  COALESCE(stats.positive_count, 0) as positive_count,
  COALESCE(stats.neutral_count, 0) as neutral_count,
  COALESCE(stats.negative_count, 0) as negative_count,
  COALESCE(stats.follow_up_count, 0) as follow_up_count,
  COALESCE(alert_stats.open_alerts, 0) as open_alerts
FROM agents a
LEFT JOIN (
  SELECT 
    e.panel_id,
    AVG(e.quality_score) as avg_quality,
    AVG(e.sentiment_score) as avg_sentiment,
    COUNT(CASE WHEN e.sentiment = 'positive' THEN 1 END) as positive_count,
    COUNT(CASE WHEN e.sentiment = 'neutral' THEN 1 END) as neutral_count,
    COUNT(CASE WHEN e.sentiment = 'negative' THEN 1 END) as negative_count,
    COUNT(CASE WHEN e.follow_up_worthy THEN 1 END) as follow_up_count
  FROM interview_evaluations e
  GROUP BY e.panel_id
) stats ON a.id = stats.panel_id
LEFT JOIN (
  SELECT panel_id, COUNT(*) as open_alerts
  FROM alerts
  WHERE status = 'new'
  GROUP BY panel_id
) alert_stats ON a.id = alert_stats.panel_id;

-- Recent activity view
CREATE OR REPLACE VIEW v_recent_activity AS
SELECT 
  'interview' as activity_type,
  i.id as record_id,
  i.panel_id,
  a.name as panel_name,
  i.participant_name as description,
  i.status,
  i.completed_at as activity_at
FROM interviews i
JOIN agents a ON i.panel_id = a.id
WHERE i.completed_at > NOW() - INTERVAL '7 days'
UNION ALL
SELECT 
  'alert' as activity_type,
  al.id as record_id,
  al.panel_id,
  a.name as panel_name,
  al.title as description,
  al.status,
  al.created_at as activity_at
FROM alerts al
JOIN agents a ON al.panel_id = a.id
WHERE al.created_at > NOW() - INTERVAL '7 days'
ORDER BY activity_at DESC;

-- ============================================================================
-- DEFAULT DATA
-- ============================================================================

-- Default saved queries for AI analyst
INSERT INTO analyst_saved_queries (id, panel_id, name, query, category, description) VALUES
  (uuid_generate_v4(), NULL, 'Top Pain Points', 'What are the most common pain points mentioned across all interviews?', 'themes', 'Identify recurring frustrations and challenges'),
  (uuid_generate_v4(), NULL, 'Sentiment Summary', 'Summarize the overall sentiment. What are people happy about vs frustrated with?', 'sentiment', 'Overview of positive and negative feedback'),
  (uuid_generate_v4(), NULL, 'Key Quotes', 'Give me the 10 most impactful quotes from these interviews', 'export', 'Extract memorable quotes for reports'),
  (uuid_generate_v4(), NULL, 'Executive Summary', 'Write a 3-paragraph executive summary of the findings', 'export', 'High-level summary for stakeholders'),
  (uuid_generate_v4(), NULL, 'Recommendations', 'Based on these interviews, what are your top 5 recommendations?', 'custom', 'Actionable insights from the data'),
  (uuid_generate_v4(), NULL, 'Surprising Insights', 'What unexpected or surprising patterns did you notice?', 'themes', 'Surface non-obvious findings'),
  (uuid_generate_v4(), NULL, 'Compare Segments', 'Compare what enterprise customers said vs small business customers', 'comparison', 'Segment-based analysis')
ON CONFLICT DO NOTHING;
`;

function generatePassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 24; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export async function createSupabaseProject(ctx: ProvisionContext): Promise<ProvisionStepResult> {
  if (ctx.metadata.supabaseProjectRef && ctx.metadata.supabaseUrl) {
    console.log(`[supabase] Project already exists: ${ctx.metadata.supabaseProjectRef}`);
    return { nextState: 'SUPABASE_READY', metadata: ctx.metadata };
  }

  const safeName = ctx.projectSlug.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 40);
  console.log(`[supabase] Creating project: ${safeName}`);

  const listRes = await fetch(`${SUPABASE_API}/projects`, {
    headers: { Authorization: `Bearer ${ctx.supabaseToken}` },
  });
  if (!listRes.ok) throw new Error('Failed to list Supabase projects');

  const projects = await listRes.json();
  const existing = projects.find((p: any) => p.name === safeName);

  if (existing) {
    console.log(`[supabase] Found existing project: ${existing.id}`);
    const keys = await fetchKeys(ctx.supabaseToken, existing.id);
    return {
      nextState: 'SUPABASE_READY',
      metadata: {
        ...ctx.metadata,
        supabaseProjectRef: existing.id,
        supabaseUrl: `https://${existing.id}.supabase.co`,
        supabaseAnonKey: keys.anonKey,
        supabaseServiceKey: keys.serviceKey,
      },
    };
  }

  const createRes = await fetch(`${SUPABASE_API}/projects`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ctx.supabaseToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: safeName,
      organization_id: ctx.supabaseOrgId,
      region: 'ap-southeast-2',
      plan: 'free',
      db_pass: generatePassword(),
    }),
  });

  if (!createRes.ok) throw new Error(`Supabase create failed: ${await createRes.text()}`);
  const project = await createRes.json();

  console.log(`[supabase] Project created: ${project.id}, waiting for ready state...`);

  return {
    nextState: 'SUPABASE_CREATING',
    metadata: { ...ctx.metadata, supabaseProjectRef: project.id, supabaseUrl: `https://${project.id}.supabase.co` },
  };
}

export async function waitForSupabaseReady(ctx: ProvisionContext): Promise<ProvisionStepResult> {
  const projectRef = ctx.metadata.supabaseProjectRef;
  if (!projectRef) throw new Error('No Supabase project ref');

  const res = await fetch(`${SUPABASE_API}/projects/${projectRef}`, {
    headers: { Authorization: `Bearer ${ctx.supabaseToken}` },
  });
  if (!res.ok) {
    console.log(`[supabase] Project ${projectRef} not ready yet (fetch failed)`);
    return { nextState: 'SUPABASE_CREATING', metadata: ctx.metadata };
  }

  const project = await res.json();
  if (project.status !== 'ACTIVE_HEALTHY') {
    console.log(`[supabase] Project ${projectRef} status: ${project.status}, waiting...`);
    return { nextState: 'SUPABASE_CREATING', metadata: ctx.metadata };
  }

  console.log(`[supabase] Project ${projectRef} is ACTIVE_HEALTHY`);

  const keys = await fetchKeys(ctx.supabaseToken, projectRef);

  // Run migration with error handling
  console.log(`[supabase] Running schema migration...`);
  const migrationRes = await fetch(`${SUPABASE_API}/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ctx.supabaseToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: CHILD_SCHEMA }),
  });

  if (!migrationRes.ok) {
    const errorText = await migrationRes.text();
    console.error(`[supabase] Migration failed: ${errorText}`);
    throw new Error(`Schema migration failed: ${errorText}`);
  }
  console.log(`[supabase] Schema migration completed successfully`);

  // Create buckets with logging
  const supabaseUrl = `https://${projectRef}.supabase.co`;
  const buckets = ['transcripts', 'recordings', 'exports', 'assets'];

  for (const name of buckets) {
    try {
      const bucketRes = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${keys.serviceKey}`,
          'Content-Type': 'application/json',
          apikey: keys.serviceKey
        },
        body: JSON.stringify({ id: name, name, public: name === 'assets' }),
      });

      if (bucketRes.ok) {
        console.log(`[supabase] Created bucket: ${name}`);
      } else if (bucketRes.status === 409) {
        console.log(`[supabase] Bucket already exists: ${name}`);
      } else {
        const errText = await bucketRes.text();
        console.warn(`[supabase] Failed to create bucket ${name}: ${errText}`);
      }
    } catch (err) {
      console.warn(`[supabase] Error creating bucket ${name}:`, err);
    }
  }

  // NOTE: Auth config moved to configureSupabaseAuth() - called after Vercel is ready

  return {
    nextState: 'SUPABASE_READY',
    metadata: { ...ctx.metadata, supabaseAnonKey: keys.anonKey, supabaseServiceKey: keys.serviceKey },
  };
}

// Configure Supabase auth with actual Vercel URL (called after Vercel deployment)
export async function configureSupabaseAuth(ctx: ProvisionContext): Promise<void> {
  const projectRef = ctx.metadata.supabaseProjectRef;
  const vercelUrl = ctx.metadata.vercelUrl;

  if (!projectRef || !vercelUrl) {
    console.warn('[supabase] Cannot configure auth - missing projectRef or vercelUrl');
    return;
  }

  console.log(`[supabase] Configuring auth for ${projectRef} with URL: ${vercelUrl}`);

  try {
    const response = await fetch(`${SUPABASE_API}/projects/${projectRef}/config/auth`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${ctx.supabaseToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        site_url: vercelUrl,
        uri_allow_list: [
          `${vercelUrl}/**`,
          `${vercelUrl}/auth/callback`,
          'http://localhost:3000/**',
          'http://localhost:3000/auth/callback',
        ],
        redirect_urls: [
          `${vercelUrl}/auth/callback`,
          `${vercelUrl}/`,
          'http://localhost:3000/auth/callback',
          'http://localhost:3000/',
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[supabase] Auth config failed: ${errorText}`);
      throw new Error(`Supabase auth config failed: ${errorText}`);
    }

    console.log(`[supabase] Auth configured successfully for ${vercelUrl}`);
  } catch (err) {
    console.error('[supabase] Auth config error:', err);
    throw err;
  }
}

// Verify Supabase is fully configured (for verification step)
export async function verifySupabaseSetup(ctx: ProvisionContext): Promise<{ success: boolean; issues: string[] }> {
  const issues: string[] = [];
  const projectRef = ctx.metadata.supabaseProjectRef;
  const serviceKey = ctx.metadata.supabaseServiceKey;

  if (!projectRef || !serviceKey) {
    return { success: false, issues: ['Missing Supabase project ref or service key'] };
  }

  const supabaseUrl = `https://${projectRef}.supabase.co`;

  // Check if core tables exist
  const requiredTables = ['agents', 'interviews', 'interview_transcripts', 'interview_evaluations', 'panel_insights'];

  for (const table of requiredTables) {
    try {
      const tableRes = await fetch(`${supabaseUrl}/rest/v1/${table}?select=id&limit=1`, {
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
        },
      });

      if (!tableRes.ok) {
        issues.push(`Table '${table}' not accessible: ${tableRes.status}`);
      }
    } catch (err) {
      issues.push(`Failed to query '${table}' table: ${err}`);
    }
  }

  // Check platforms table
  try {
    const platformsRes = await fetch(`${supabaseUrl}/rest/v1/platforms?select=id&limit=1`, {
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
    });

    if (!platformsRes.ok) {
      issues.push(`Platforms table not accessible: ${platformsRes.status}`);
    }
  } catch (err) {
    issues.push(`Failed to query platforms table: ${err}`);
  }

  // Check buckets exist
  try {
    const bucketsRes = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
    });

    if (bucketsRes.ok) {
      const buckets = await bucketsRes.json();
      const bucketNames = buckets.map((b: any) => b.name);
      const required = ['transcripts', 'recordings', 'exports', 'assets'];

      for (const req of required) {
        if (!bucketNames.includes(req)) {
          issues.push(`Missing storage bucket: ${req}`);
        }
      }
    } else {
      issues.push(`Failed to list buckets: ${bucketsRes.status}`);
    }
  } catch (err) {
    issues.push(`Failed to check buckets: ${err}`);
  }

  return {
    success: issues.length === 0,
    issues,
  };
}

async function fetchKeys(token: string, projectRef: string): Promise<{ anonKey: string; serviceKey: string }> {
  const res = await fetch(`${SUPABASE_API}/projects/${projectRef}/api-keys`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch keys');
  const keys = await res.json();
  return {
    anonKey: keys.find((k: any) => k.name === 'anon')?.api_key || '',
    serviceKey: keys.find((k: any) => k.name === 'service_role')?.api_key || '',
  };
}