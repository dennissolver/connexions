-- =============================================================================
-- AI AGENT INTERVIEWS - COMPLETE SCHEMA
-- Migration: 20241215000000_initial_schema.sql
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- CORE TABLES
-- =============================================================================

-- Clients/Tenants table
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  company_name TEXT,
  company_website TEXT,
  subscription_tier TEXT DEFAULT 'free',
  agents_limit INT DEFAULT 3,
  interviews_limit INT DEFAULT 100,
  
  -- Platform config
  setup_data JSONB DEFAULT '{}',
  branding JSONB DEFAULT '{
    "primary_color": "#7C3AED",
    "secondary_color": "#10B981", 
    "background_color": "#0F172A",
    "text_color": "#FFFFFF",
    "font_family": "Inter"
  }',
  
  -- External service IDs (for white-label)
  supabase_project_id TEXT,
  supabase_url TEXT,
  vercel_project_id TEXT,
  vercel_url TEXT,
  elevenlabs_setup_agent_id TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agents table
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Basic info
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
  
  -- Company context
  company_name TEXT,
  interview_purpose TEXT,
  target_interviewees TEXT,
  
  -- Agent persona (DYNAMIC - researched per role)
  agent_role TEXT,                    -- e.g., "Marine Biologist", "Forensic Accountant"
  role_profile JSONB,                 -- AI-researched expertise, techniques, approach
  interviewer_tone TEXT DEFAULT 'professional',
  estimated_duration_mins INT DEFAULT 10,
  
  -- ElevenLabs config
  elevenlabs_agent_id TEXT,
  voice_id TEXT,
  
  -- Interview structure
  key_topics TEXT[],
  key_questions TEXT[],
  constraints TEXT[],
  system_prompt TEXT,
  first_message TEXT,
  
  -- Branding
  primary_color TEXT DEFAULT '#7C3AED',
  background_color TEXT DEFAULT '#0F172A',
  logo_url TEXT,
  
  -- Stats
  total_interviews INT DEFAULT 0,
  completed_interviews INT DEFAULT 0,
  avg_duration_seconds INT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interviews table
CREATE TABLE IF NOT EXISTS interviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  
  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'abandoned')),
  source TEXT DEFAULT 'voice' CHECK (source IN ('voice', 'text', 'web')),
  
  -- Interviewee info
  interviewee_name TEXT,
  interviewee_email TEXT,
  interviewee_profile JSONB DEFAULT '{}',
  
  -- Conversation data
  conversation_id TEXT,               -- ElevenLabs conversation ID
  messages JSONB DEFAULT '[]',
  
  -- Results
  transcript TEXT,
  transcript_url TEXT,                -- URL to transcript in storage bucket
  summary TEXT,
  feedback JSONB DEFAULT '{}',
  extracted_data JSONB DEFAULT '{}',  -- Includes ai_analysis when run
  
  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_seconds INT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Setup Sessions table (tracks voice setup conversations)
CREATE TABLE IF NOT EXISTS setup_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id TEXT UNIQUE NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'in_progress' CHECK (status IN (
    'in_progress',
    'completed',
    'extracted',
    'confirmed',
    'built',
    'failed'
  )),
  
  -- Raw conversation data
  transcript TEXT,
  messages JSONB DEFAULT '[]',
  
  -- Extracted data (from AI extraction)
  extracted_data JSONB DEFAULT '{}',
  validation_result JSONB DEFAULT '{}',
  corrections_made JSONB DEFAULT '[]',
  
  -- Final confirmed data (after user edits)
  confirmed_data JSONB DEFAULT '{}',
  
  -- Result
  agent_id UUID REFERENCES agents(id),
  error_message TEXT,
  
  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  extracted_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  built_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Platform Setups table (tracks white-label platform creation)
CREATE TABLE IF NOT EXISTS platform_setups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Client info
  company_name TEXT NOT NULL,
  company_email TEXT NOT NULL,
  company_website TEXT,
  admin_name TEXT,
  admin_email TEXT,
  admin_phone TEXT,
  
  -- Voice agent config
  agent_name TEXT,
  voice_gender TEXT DEFAULT 'female',
  
  -- Created resources
  supabase_project_id TEXT,
  supabase_url TEXT,
  supabase_anon_key TEXT,
  elevenlabs_agent_id TEXT,
  github_repo_url TEXT,
  vercel_project_id TEXT,
  vercel_url TEXT,
  
  -- Setup status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'creating', 'completed', 'failed')),
  setup_log JSONB DEFAULT '[]',
  error_message TEXT,
  full_config JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_agents_client_id ON agents(client_id);
CREATE INDEX IF NOT EXISTS idx_agents_slug ON agents(slug);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_elevenlabs ON agents(elevenlabs_agent_id);
CREATE INDEX IF NOT EXISTS idx_interviews_agent_id ON interviews(agent_id);
CREATE INDEX IF NOT EXISTS idx_interviews_status ON interviews(status);
CREATE INDEX IF NOT EXISTS idx_interviews_conversation ON interviews(conversation_id);
CREATE INDEX IF NOT EXISTS idx_interviews_created ON interviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_setup_sessions_conversation ON setup_sessions(conversation_id);
CREATE INDEX IF NOT EXISTS idx_setup_sessions_status ON setup_sessions(status);
CREATE INDEX IF NOT EXISTS idx_setup_sessions_agent ON setup_sessions(agent_id);
CREATE INDEX IF NOT EXISTS idx_platform_setups_status ON platform_setups(status);
CREATE INDEX IF NOT EXISTS idx_platform_setups_email ON platform_setups(company_email);

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Update timestamps trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Increment total interviews count
CREATE OR REPLACE FUNCTION increment_agent_interviews(agent_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE agents SET 
    total_interviews = COALESCE(total_interviews, 0) + 1,
    updated_at = NOW()
  WHERE id = agent_uuid;
END;
$$ LANGUAGE plpgsql;

-- Increment completed interviews count
CREATE OR REPLACE FUNCTION increment_agent_completed_interviews(agent_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE agents SET 
    completed_interviews = COALESCE(completed_interviews, 0) + 1,
    updated_at = NOW()
  WHERE id = agent_uuid;
END;
$$ LANGUAGE plpgsql;

-- Generate unique slug from name
CREATE OR REPLACE FUNCTION generate_agent_slug(base_name TEXT)
RETURNS TEXT AS $$
DECLARE
  new_slug TEXT;
  counter INT := 0;
BEGIN
  new_slug := lower(regexp_replace(base_name, '[^a-zA-Z0-9]+', '-', 'g'));
  new_slug := trim(both '-' from new_slug);
  
  WHILE EXISTS (SELECT 1 FROM agents WHERE slug = new_slug || CASE WHEN counter > 0 THEN '-' || counter ELSE '' END) LOOP
    counter := counter + 1;
  END LOOP;
  
  RETURN new_slug || CASE WHEN counter > 0 THEN '-' || counter ELSE '' END;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_agents_updated_at ON agents;
CREATE TRIGGER update_agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_setup_sessions_updated_at ON setup_sessions;
CREATE TRIGGER update_setup_sessions_updated_at
  BEFORE UPDATE ON setup_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE setup_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_setups ENABLE ROW LEVEL SECURITY;

-- Clients policies
CREATE POLICY "Service role full access clients" ON clients
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Users can view own client" ON clients
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own client" ON clients
  FOR UPDATE USING (auth.uid()::text = id::text);

-- Agents policies
CREATE POLICY "Service role full access agents" ON agents
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Public can view active agents" ON agents
  FOR SELECT USING (status = 'active');

CREATE POLICY "Users can manage own agents" ON agents
  FOR ALL USING (
    client_id IN (SELECT id FROM clients WHERE auth.uid()::text = id::text)
  );

-- Interviews policies
CREATE POLICY "Service role full access interviews" ON interviews
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Public can create interviews" ON interviews
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view own interviews" ON interviews
  FOR SELECT USING (
    agent_id IN (
      SELECT id FROM agents WHERE client_id IN (
        SELECT id FROM clients WHERE auth.uid()::text = id::text
      )
    )
  );

-- Setup sessions policies
CREATE POLICY "Service role full access setup_sessions" ON setup_sessions
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Platform setups policies (admin only)
CREATE POLICY "Service role manages platform setups" ON platform_setups
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE clients IS 'Client/tenant accounts for multi-tenant SaaS';
COMMENT ON TABLE agents IS 'AI interviewer agents created by clients';
COMMENT ON TABLE interviews IS 'Individual interviews sessions conducted by agents';
COMMENT ON TABLE setup_sessions IS 'Voice setup conversations before agent creation';
COMMENT ON TABLE platform_setups IS 'White-label platform creation tracking';

COMMENT ON COLUMN agents.agent_role IS 'Professional role/persona - dynamically researched';
COMMENT ON COLUMN agents.role_profile IS 'AI-researched expertise, techniques, approach for the role';
COMMENT ON COLUMN agents.system_prompt IS 'Generated system prompt for ElevenLabs agent';
COMMENT ON COLUMN interviews.extracted_data IS 'Includes ai_analysis field when analysis is run';
