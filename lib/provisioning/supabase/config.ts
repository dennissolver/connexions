// lib/provisioning/supabase/config.ts
// Configures Supabase auth URLs AND runs COMPLETE schema migration (base + extensions)
// DEPENDS ON: vercel (needs URL), supabase (needs project ref + keys)

import { ProvisionContext, StepResult } from '../types';

const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

// =============================================================================
// COMPLETE SCHEMA - BASE + EXTENSIONS
// =============================================================================
const COMPLETE_SCHEMA = `
-- ============================================================================
-- UNIVERSAL INTERVIEWS - COMPLETE SCHEMA (BASE + EXTENSIONS)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- BASE TABLES
-- ============================================================================

-- AGENTS TABLE (Interview Panels)
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived', 'draft')),
  company_name TEXT,
  research_goal TEXT,
  target_audience TEXT,
  interview_context TEXT CHECK (interview_context IN ('B2B', 'B2C')),
  questions JSONB DEFAULT '[]',
  greeting TEXT,
  interviewer_tone TEXT DEFAULT 'professional',
  estimated_duration_mins INT DEFAULT 10,
  elevenlabs_agent_id TEXT,
  voice_id TEXT,
  total_interviews INT DEFAULT 0,
  completed_interviews INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- INTERVIEWS TABLE
CREATE TABLE IF NOT EXISTS interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  panel_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  participant_name TEXT,
  participant_email TEXT,
  participant_company TEXT,
  participant_role TEXT,
  participant_country TEXT,
  elevenlabs_conversation_id TEXT UNIQUE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'abandoned')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_seconds INT,
  evaluated BOOLEAN DEFAULT false,
  evaluated_at TIMESTAMPTZ,
  source TEXT DEFAULT 'direct',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- INTERVIEW TRANSCRIPTS TABLE
CREATE TABLE IF NOT EXISTS interview_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID REFERENCES interviews(id) ON DELETE CASCADE,
  elevenlabs_conversation_id TEXT UNIQUE,
  elevenlabs_agent_id TEXT,
  transcript JSONB,
  transcript_text TEXT,
  analysis JSONB,
  participant_name TEXT,
  participant_email TEXT,
  participant_city TEXT,
  status TEXT DEFAULT 'received',
  call_duration_secs INT,
  metadata JSONB DEFAULT '{}',
  forwarded_to_parent BOOLEAN DEFAULT FALSE,
  forwarded_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- INTERVIEWEES TABLE (Invited participants)
CREATE TABLE IF NOT EXISTS interviewees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  panel_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  role TEXT,
  custom_field TEXT,
  custom_data JSONB DEFAULT '{}',
  invite_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  status TEXT DEFAULT 'invited' CHECK (status IN ('invited', 'reminded', 'started', 'completed', 'expired', 'declined')),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  reminded_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  interview_id UUID REFERENCES interviews(id),
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- EVALUATIONS TABLE (Agent/Panel quality scores)
CREATE TABLE IF NOT EXISTS evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  overall_score DECIMAL(5,2),
  response_quality DECIMAL(5,2),
  engagement_score DECIMAL(5,2),
  completion_rate DECIMAL(5,2),
  strengths JSONB DEFAULT '[]',
  improvements JSONB DEFAULT '[]',
  notes TEXT,
  evaluated_by TEXT,
  model_used TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SETUP CONVERSATIONS TABLE (Sandra's panel creation chats)
CREATE TABLE IF NOT EXISTS setup_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elevenlabs_conversation_id TEXT UNIQUE NOT NULL,
  elevenlabs_agent_id TEXT,
  panel_created_id UUID REFERENCES agents(id),
  transcript_text TEXT,
  transcript_json JSONB,
  analysis JSONB,
  metadata JSONB,
  status TEXT DEFAULT 'received',
  call_duration_seconds INT,
  conversation_started_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- EXTENSION TABLES
-- ============================================================================

-- PANEL DRAFTS (Sandra conversation outputs before publishing)
-- Column names match Universal Interviews save-draft API exactly
CREATE TABLE IF NOT EXISTS panel_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  description TEXT,
  target_audience TEXT,
  tone TEXT,
  duration_minutes INTEGER,
  questions JSONB DEFAULT '[]',
  agent_name TEXT,
  voice_gender TEXT,
  closing_message TEXT,
  greeting TEXT,
  conversation_id TEXT,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- INTERVIEW EVALUATIONS (Per-interview AI analysis)
CREATE TABLE IF NOT EXISTS interview_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID REFERENCES interviews(id) ON DELETE CASCADE,
  transcript_id UUID REFERENCES interview_transcripts(id) ON DELETE CASCADE,
  panel_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  summary TEXT,
  executive_summary TEXT,
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative', 'mixed')),
  sentiment_score DECIMAL(3,2) CHECK (sentiment_score >= -1 AND sentiment_score <= 1),
  sentiment_reasoning TEXT,
  quality_score INTEGER CHECK (quality_score >= 0 AND quality_score <= 100),
  quality_reasoning TEXT,
  engagement_level TEXT CHECK (engagement_level IN ('high', 'medium', 'low')),
  key_quotes JSONB DEFAULT '[]',
  topics JSONB DEFAULT '[]',
  pain_points JSONB DEFAULT '[]',
  desires JSONB DEFAULT '[]',
  surprises JSONB DEFAULT '[]',
  follow_up_worthy BOOLEAN DEFAULT false,
  follow_up_reason TEXT,
  needs_review BOOLEAN DEFAULT false,
  review_reason TEXT,
  question_responses JSONB DEFAULT '[]',
  model_used TEXT,
  prompt_version TEXT,
  raw_response JSONB,
  tokens_used INTEGER,
  evaluation_duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(interview_id)
);

-- PANEL INSIGHTS (Aggregated insights across all interviews for a panel)
CREATE TABLE IF NOT EXISTS panel_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  panel_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  interview_count INTEGER,
  evaluated_count INTEGER,
  avg_sentiment_score DECIMAL(3,2),
  sentiment_breakdown JSONB,
  sentiment_trend JSONB,
  avg_quality_score DECIMAL(5,2),
  quality_distribution JSONB,
  top_themes JSONB,
  theme_correlations JSONB,
  common_pain_points JSONB,
  common_desires JSONB,
  curated_quotes JSONB,
  word_frequency JSONB,
  outlier_interviews JSONB,
  executive_summary TEXT,
  key_findings JSONB,
  recommendations JSONB,
  segment_comparisons JSONB,
  model_used TEXT,
  prompt_version TEXT,
  generation_duration_ms INTEGER,
  valid_until TIMESTAMPTZ,
  stale BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ANALYST SESSIONS (Conversational interface to query interview data)
CREATE TABLE IF NOT EXISTS analyst_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  panel_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  user_id UUID,
  title TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ
);

-- ANALYST MESSAGES
CREATE TABLE IF NOT EXISTS analyst_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- ANALYST SAVED QUERIES
CREATE TABLE IF NOT EXISTS analyst_saved_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- REPORTS
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- EXPORTS
CREATE TABLE IF NOT EXISTS exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- ALERTS
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Base indexes
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_slug ON agents(slug);
CREATE INDEX IF NOT EXISTS idx_agents_elevenlabs ON agents(elevenlabs_agent_id);
CREATE INDEX IF NOT EXISTS idx_interviews_panel ON interviews(panel_id);
CREATE INDEX IF NOT EXISTS idx_interviews_status ON interviews(status);
CREATE INDEX IF NOT EXISTS idx_interviews_conversation ON interviews(elevenlabs_conversation_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_interview ON interview_transcripts(interview_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_conversation ON interview_transcripts(elevenlabs_conversation_id);
CREATE INDEX IF NOT EXISTS idx_interviewees_panel ON interviewees(panel_id);
CREATE INDEX IF NOT EXISTS idx_interviewees_token ON interviewees(invite_token);
CREATE INDEX IF NOT EXISTS idx_setup_conv_elevenlabs ON setup_conversations(elevenlabs_conversation_id);

-- Extension indexes
CREATE INDEX IF NOT EXISTS idx_panel_drafts_status ON panel_drafts(status);
CREATE INDEX IF NOT EXISTS idx_panel_drafts_conversation ON panel_drafts(conversation_id);
CREATE INDEX IF NOT EXISTS idx_interview_evaluations_interview ON interview_evaluations(interview_id);
CREATE INDEX IF NOT EXISTS idx_interview_evaluations_panel ON interview_evaluations(panel_id);
CREATE INDEX IF NOT EXISTS idx_interview_evaluations_sentiment ON interview_evaluations(sentiment);
CREATE INDEX IF NOT EXISTS idx_panel_insights_panel ON panel_insights(panel_id);
CREATE INDEX IF NOT EXISTS idx_analyst_sessions_panel ON analyst_sessions(panel_id);
CREATE INDEX IF NOT EXISTS idx_analyst_messages_session ON analyst_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_alerts_panel ON alerts(panel_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status) WHERE status = 'new';

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_agents_updated ON agents;
CREATE TRIGGER trg_agents_updated BEFORE UPDATE ON agents
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_interviews_updated ON interviews;
CREATE TRIGGER trg_interviews_updated BEFORE UPDATE ON interviews
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_transcripts_updated ON interview_transcripts;
CREATE TRIGGER trg_transcripts_updated BEFORE UPDATE ON interview_transcripts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_interviewees_updated ON interviewees;
CREATE TRIGGER trg_interviewees_updated BEFORE UPDATE ON interviewees
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_panel_drafts_updated ON panel_drafts;
CREATE TRIGGER trg_panel_drafts_updated BEFORE UPDATE ON panel_drafts
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
-- RLS POLICIES
-- ============================================================================

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviewees ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE setup_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE panel_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE panel_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyst_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyst_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyst_saved_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on agents" ON agents;
DROP POLICY IF EXISTS "Allow all on interviews" ON interviews;
DROP POLICY IF EXISTS "Allow all on interview_transcripts" ON interview_transcripts;
DROP POLICY IF EXISTS "Allow all on interviewees" ON interviewees;
DROP POLICY IF EXISTS "Allow all on evaluations" ON evaluations;
DROP POLICY IF EXISTS "Allow all on setup_conversations" ON setup_conversations;
DROP POLICY IF EXISTS "Allow all on panel_drafts" ON panel_drafts;
DROP POLICY IF EXISTS "Allow all on interview_evaluations" ON interview_evaluations;
DROP POLICY IF EXISTS "Allow all on panel_insights" ON panel_insights;
DROP POLICY IF EXISTS "Allow all on analyst_sessions" ON analyst_sessions;
DROP POLICY IF EXISTS "Allow all on analyst_messages" ON analyst_messages;
DROP POLICY IF EXISTS "Allow all on analyst_saved_queries" ON analyst_saved_queries;
DROP POLICY IF EXISTS "Allow all on reports" ON reports;
DROP POLICY IF EXISTS "Allow all on exports" ON exports;
DROP POLICY IF EXISTS "Allow all on alerts" ON alerts;

CREATE POLICY "Allow all on agents" ON agents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on interviews" ON interviews FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on interview_transcripts" ON interview_transcripts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on interviewees" ON interviewees FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on evaluations" ON evaluations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on setup_conversations" ON setup_conversations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on panel_drafts" ON panel_drafts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on interview_evaluations" ON interview_evaluations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on panel_insights" ON panel_insights FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on analyst_sessions" ON analyst_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on analyst_messages" ON analyst_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on analyst_saved_queries" ON analyst_saved_queries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on reports" ON reports FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on exports" ON exports FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on alerts" ON alerts FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- DEFAULT DATA
-- ============================================================================

INSERT INTO analyst_saved_queries (id, panel_id, name, query, category, description) VALUES
  (gen_random_uuid(), NULL, 'Top Pain Points', 'What are the most common pain points mentioned across all interviews?', 'themes', 'Identify recurring frustrations and challenges'),
  (gen_random_uuid(), NULL, 'Sentiment Summary', 'Summarize the overall sentiment. What are people happy about vs frustrated with?', 'sentiment', 'Overview of positive and negative feedback'),
  (gen_random_uuid(), NULL, 'Key Quotes', 'Give me the 10 most impactful quotes from these interviews', 'export', 'Extract memorable quotes for reports'),
  (gen_random_uuid(), NULL, 'Executive Summary', 'Write a 3-paragraph executive summary of the findings', 'export', 'High-level summary for stakeholders'),
  (gen_random_uuid(), NULL, 'Recommendations', 'Based on these interviews, what are your top 5 recommendations?', 'custom', 'Actionable insights from the data')
ON CONFLICT DO NOTHING;
`;

export async function supabaseConfigExecute(ctx: ProvisionContext): Promise<StepResult> {
  // Already configured? Skip (idempotent)
  if (ctx.metadata.supabase_urls_configured && ctx.metadata.supabase_schema_applied) {
    console.log('[supabase-config.execute] Already configured');
    return { status: 'advance' };
  }

  if (!SUPABASE_ACCESS_TOKEN) {
    return {
      status: 'fail',
      error: 'SUPABASE_ACCESS_TOKEN not configured',
    };
  }

  const projectRef = ctx.metadata.supabase_project_ref as string;
  const vercelUrl = ctx.metadata.vercel_url as string;

  if (!projectRef || !vercelUrl) {
    return { status: 'wait' };
  }

  try {
    // Step 1: Run complete schema migration (base + extensions)
    if (!ctx.metadata.supabase_schema_applied) {
      console.log('[supabase-config.execute] Running complete schema migration...');

      const schemaRes = await fetch(
        `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: COMPLETE_SCHEMA }),
        }
      );

      if (!schemaRes.ok) {
        const text = await schemaRes.text();
        if (schemaRes.status === 404) {
          console.log('[supabase-config.execute] Database not ready yet');
          return { status: 'wait' };
        }
        console.error('[supabase-config.execute] Schema migration failed:', text);
        return {
          status: 'fail',
          error: `Schema migration failed (${schemaRes.status}): ${text}`,
        };
      }

      console.log('[supabase-config.execute] Complete schema migration done');
    }

    // Step 2: Configure auth URLs
    if (!ctx.metadata.supabase_urls_configured) {
      console.log('[supabase-config.execute] Configuring auth URLs...');

      const authConfigUrl = `https://api.supabase.com/v1/projects/${projectRef}/config/auth`;
      const authRes = await fetch(authConfigUrl, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          site_url: vercelUrl,
          uri_allow_list: [
            'http://localhost:3000/**',
            'http://localhost:3000',
            `${vercelUrl}/**`,
            vercelUrl,
          ].join(','),
        }),
      });

      if (!authRes.ok) {
        const text = await authRes.text();
        if (authRes.status === 404) {
          console.log('[supabase-config.execute] Auth config not ready yet');
          return { status: 'wait' };
        }
        return {
          status: 'fail',
          error: `Supabase auth config failed (${authRes.status}): ${text}`,
        };
      }

      console.log('[supabase-config.execute] Auth URLs configured');
    }

    // Step 3: Create storage buckets
    console.log('[supabase-config.execute] Creating storage buckets...');
    const supabaseUrl = ctx.metadata.supabase_url as string;
    const serviceKey = ctx.metadata.supabase_service_role_key as string;

    if (supabaseUrl && serviceKey) {
      const buckets = ['transcripts', 'recordings', 'exports', 'assets'];
      for (const bucket of buckets) {
        try {
          await fetch(`${supabaseUrl}/storage/v1/bucket`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${serviceKey}`,
              'Content-Type': 'application/json',
              'apikey': serviceKey,
            },
            body: JSON.stringify({
              id: bucket,
              name: bucket,
              public: bucket === 'assets',
            }),
          });
          console.log(`[supabase-config.execute] Created bucket: ${bucket}`);
        } catch {
          // Bucket may already exist, ignore
        }
      }
    }

    console.log(`[supabase-config.execute] Fully configured: ${projectRef}`);

    return {
      status: 'advance',
      metadata: {
        supabase_urls_configured: true,
        supabase_schema_applied: true,
      },
    };
  } catch (err) {
    return {
      status: 'fail',
      error: `Supabase config failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export async function supabaseConfigVerify(ctx: ProvisionContext): Promise<StepResult> {
  if (ctx.metadata.supabase_urls_configured && ctx.metadata.supabase_schema_applied) {
    return { status: 'advance' };
  }
  return { status: 'wait' };
}
