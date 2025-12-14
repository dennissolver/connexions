-- =============================================================================
-- SAFE UPDATES FOR EXISTING TABLES
-- Migration: 20241215000002_safe_column_updates.sql
-- Run this if tables already exist to add any missing columns
-- =============================================================================

-- =============================================================================
-- AGENTS TABLE UPDATES
-- =============================================================================

-- Add agent_role if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'agents' AND column_name = 'agent_role'
  ) THEN
    ALTER TABLE agents ADD COLUMN agent_role TEXT;
    COMMENT ON COLUMN agents.agent_role IS 'Professional role/persona - dynamically researched';
  END IF;
END $$;

-- Add role_profile if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'agents' AND column_name = 'role_profile'
  ) THEN
    ALTER TABLE agents ADD COLUMN role_profile JSONB;
    COMMENT ON COLUMN agents.role_profile IS 'AI-researched expertise, techniques, approach for the role';
  END IF;
END $$;

-- Add system_prompt if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'agents' AND column_name = 'system_prompt'
  ) THEN
    ALTER TABLE agents ADD COLUMN system_prompt TEXT;
  END IF;
END $$;

-- Add first_message if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'agents' AND column_name = 'first_message'
  ) THEN
    ALTER TABLE agents ADD COLUMN first_message TEXT;
  END IF;
END $$;

-- =============================================================================
-- CLIENTS TABLE UPDATES
-- =============================================================================

-- Update branding default to include all fields
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clients' AND column_name = 'branding'
  ) THEN
    -- Update any null branding to default
    UPDATE clients 
    SET branding = '{
      "primary_color": "#7C3AED",
      "secondary_color": "#10B981",
      "background_color": "#0F172A",
      "text_color": "#FFFFFF",
      "font_family": "Inter"
    }'::jsonb
    WHERE branding IS NULL;
  END IF;
END $$;

-- =============================================================================
-- INTERVIEWS TABLE UPDATES
-- =============================================================================

-- Add transcript_url if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'interviews' AND column_name = 'transcript_url'
  ) THEN
    ALTER TABLE interviews ADD COLUMN transcript_url TEXT;
  END IF;
END $$;

-- =============================================================================
-- CREATE MISSING TABLES
-- =============================================================================

-- Create setup_sessions if not exists
CREATE TABLE IF NOT EXISTS setup_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'in_progress',
  transcript TEXT,
  messages JSONB DEFAULT '[]',
  extracted_data JSONB DEFAULT '{}',
  validation_result JSONB DEFAULT '{}',
  corrections_made JSONB DEFAULT '[]',
  confirmed_data JSONB DEFAULT '{}',
  agent_id UUID REFERENCES agents(id),
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  extracted_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  built_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- CREATE MISSING INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_setup_sessions_conversation ON setup_sessions(conversation_id);
CREATE INDEX IF NOT EXISTS idx_setup_sessions_status ON setup_sessions(status);
CREATE INDEX IF NOT EXISTS idx_interviews_created ON interviews(created_at DESC);

-- =============================================================================
-- CREATE MISSING FUNCTIONS
-- =============================================================================

-- Ensure RPC functions exist
CREATE OR REPLACE FUNCTION increment_agent_interviews(agent_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE agents SET 
    total_interviews = COALESCE(total_interviews, 0) + 1,
    updated_at = NOW()
  WHERE id = agent_uuid;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_agent_completed_interviews(agent_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE agents SET 
    completed_interviews = COALESCE(completed_interviews, 0) + 1,
    updated_at = NOW()
  WHERE id = agent_uuid;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- ENABLE RLS ON NEW TABLES
-- =============================================================================

ALTER TABLE setup_sessions ENABLE ROW LEVEL SECURITY;

-- Setup sessions policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'setup_sessions' AND policyname = 'Service role full access setup_sessions'
  ) THEN
    CREATE POLICY "Service role full access setup_sessions" ON setup_sessions
      FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
  END IF;
END $$;
