// lib/provisioning/supabase/config.ts
// Configures Supabase auth URLs AND runs schema migration
// DEPENDS ON: vercel (needs URL), supabase (needs project ref + keys)

import { ProvisionContext, StepResult } from '../types';

const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

// Base schema - creates core tables
const BASE_SCHEMA = `
-- ============================================================================
-- UNIVERSAL INTERVIEWS - BASE SCHEMA
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- AGENTS TABLE (Interview Panels)
-- ============================================================================
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

-- ============================================================================
-- INTERVIEWS TABLE
-- ============================================================================
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

-- ============================================================================
-- INTERVIEW TRANSCRIPTS TABLE
-- ============================================================================
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

-- ============================================================================
-- INTERVIEWEES TABLE (Invited participants)
-- ============================================================================
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

-- ============================================================================
-- EVALUATIONS TABLE (Agent/Panel quality scores)
-- ============================================================================
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

-- ============================================================================
-- SETUP CONVERSATIONS TABLE (Sandra's panel creation chats)
-- ============================================================================
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
-- INDEXES
-- ============================================================================
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

-- ============================================================================
-- RLS POLICIES
-- ============================================================================
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviewees ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE setup_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on agents" ON agents;
DROP POLICY IF EXISTS "Allow all on interviews" ON interviews;
DROP POLICY IF EXISTS "Allow all on interview_transcripts" ON interview_transcripts;
DROP POLICY IF EXISTS "Allow all on interviewees" ON interviewees;
DROP POLICY IF EXISTS "Allow all on evaluations" ON evaluations;
DROP POLICY IF EXISTS "Allow all on setup_conversations" ON setup_conversations;

CREATE POLICY "Allow all on agents" ON agents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on interviews" ON interviews FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on interview_transcripts" ON interview_transcripts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on interviewees" ON interviewees FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on evaluations" ON evaluations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on setup_conversations" ON setup_conversations FOR ALL USING (true) WITH CHECK (true);
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
    // Step 1: Run schema migration
    if (!ctx.metadata.supabase_schema_applied) {
      console.log('[supabase-config.execute] Running schema migration...');

      const schemaRes = await fetch(
        `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: BASE_SCHEMA }),
        }
      );

      if (!schemaRes.ok) {
        const text = await schemaRes.text();
        // 404 means database not ready yet
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

      console.log('[supabase-config.execute] Schema migration complete');
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