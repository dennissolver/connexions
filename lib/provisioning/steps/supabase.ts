// lib/provisioning/steps/supabase.ts

import { ProvisionContext, ProvisionStepResult } from '../types';

const SUPABASE_API = 'https://api.supabase.com/v1';

const CHILD_SCHEMA = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

-- Agents/Panels table
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT DEFAULT '',
  status TEXT DEFAULT 'active',
  interview_type TEXT,
  agent_name TEXT DEFAULT 'Alex',
  voice_gender TEXT DEFAULT 'female',
  greeting TEXT DEFAULT '',
  questions TEXT[],
  company_name TEXT,
  interview_purpose TEXT,
  target_interviewees TEXT,
  interviewer_tone TEXT DEFAULT 'professional',
  estimated_duration_mins INT DEFAULT 10,
  elevenlabs_agent_id TEXT,
  voice_id TEXT,
  key_topics TEXT[],
  key_questions TEXT[],
  system_prompt TEXT,
  first_message TEXT,
  welcome_message TEXT,
  closing_message TEXT,
  primary_color TEXT DEFAULT '#8B5CF6',
  background_color TEXT DEFAULT '#0F172A',
  logo_url TEXT,
  total_interviews INT DEFAULT 0,
  completed_interviews INT DEFAULT 0,
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

-- Panel drafts table (for Sandra draft review flow)
CREATE TABLE IF NOT EXISTS panel_drafts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  interview_type TEXT DEFAULT '',
  target_audience TEXT DEFAULT '',
  tone TEXT DEFAULT 'professional',
  duration_minutes INTEGER DEFAULT 15,
  questions JSONB DEFAULT '[]'::jsonb,
  conversation_id TEXT,
  status TEXT DEFAULT 'draft',
  published_panel_id UUID,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interviewees table
CREATE TABLE IF NOT EXISTS interviewees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  panel_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  phone TEXT,
  company TEXT,
  metadata JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending',
  invited_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interviews table
CREATE TABLE IF NOT EXISTS interviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  panel_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  interviewee_id UUID REFERENCES interviewees(id) ON DELETE SET NULL,
  elevenlabs_agent_id TEXT,
  elevenlabs_conversation_id TEXT,
  status TEXT DEFAULT 'pending',
  source TEXT DEFAULT 'voice',
  interviewee_name TEXT,
  interviewee_email TEXT,
  interviewee_profile JSONB DEFAULT '{}',
  participant_name TEXT,
  participant_company TEXT,
  conversation_id TEXT,
  messages JSONB DEFAULT '[]',
  transcript TEXT,
  transcript_url TEXT,
  transcript_received BOOLEAN DEFAULT FALSE,
  summary TEXT,
  feedback JSONB DEFAULT '{}',
  extracted_data JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_seconds INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Setup conversations (Sandra)
CREATE TABLE IF NOT EXISTS setup_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  elevenlabs_conversation_id TEXT UNIQUE,
  elevenlabs_agent_id TEXT,
  transcript_text TEXT,
  transcript_json JSONB,
  analysis JSONB,
  metadata JSONB,
  status TEXT,
  call_duration_seconds INT,
  conversation_started_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interview transcripts
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
  conversation_started_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agents_slug ON agents(slug);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_interviews_agent_id ON interviews(agent_id);
CREATE INDEX IF NOT EXISTS idx_interviews_panel_id ON interviews(panel_id);
CREATE INDEX IF NOT EXISTS idx_interviews_status ON interviews(status);
CREATE INDEX IF NOT EXISTS idx_interviewees_panel_id ON interviewees(panel_id);
CREATE INDEX IF NOT EXISTS idx_interviewees_email ON interviewees(email);
CREATE INDEX IF NOT EXISTS idx_interview_transcripts_conversation ON interview_transcripts(elevenlabs_conversation_id);
CREATE INDEX IF NOT EXISTS idx_setup_conversations_conversation ON setup_conversations(elevenlabs_conversation_id);
CREATE INDEX IF NOT EXISTS idx_panel_drafts_status ON panel_drafts(status);
CREATE INDEX IF NOT EXISTS idx_panel_drafts_conversation_id ON panel_drafts(conversation_id);
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

  // Check if tables exist
  try {
    const tablesRes = await fetch(`${supabaseUrl}/rest/v1/agents?select=id&limit=1`, {
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
    });

    if (!tablesRes.ok) {
      issues.push(`Agents table not accessible: ${tablesRes.status}`);
    }
  } catch (err) {
    issues.push(`Failed to query agents table: ${err}`);
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