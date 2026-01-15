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
    return { nextState: 'SUPABASE_READY', metadata: ctx.metadata };
  }

  const safeName = ctx.projectSlug.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 40);

  const listRes = await fetch(`${SUPABASE_API}/projects`, {
    headers: { Authorization: `Bearer ${ctx.supabaseToken}` },
  });
  if (!listRes.ok) throw new Error('Failed to list Supabase projects');

  const projects = await listRes.json();
  const existing = projects.find((p: any) => p.name === safeName);

  if (existing) {
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
  if (!res.ok) return { nextState: 'SUPABASE_CREATING', metadata: ctx.metadata };

  const project = await res.json();
  if (project.status !== 'ACTIVE_HEALTHY') {
    return { nextState: 'SUPABASE_CREATING', metadata: ctx.metadata };
  }

  const keys = await fetchKeys(ctx.supabaseToken, projectRef);

  // Run migration
  await fetch(`${SUPABASE_API}/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ctx.supabaseToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: CHILD_SCHEMA }),
  });

  // Create buckets
  const supabaseUrl = `https://${projectRef}.supabase.co`;
  for (const name of ['transcripts', 'recordings', 'exports', 'assets']) {
    await fetch(`${supabaseUrl}/storage/v1/bucket`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${keys.serviceKey}`, 'Content-Type': 'application/json', apikey: keys.serviceKey },
      body: JSON.stringify({ id: name, name, public: name === 'assets' }),
    }).catch(() => {});
  }

  // NOTE: Auth config moved to configureSupabaseAuth() - called after Vercel is ready

  return {
    nextState: 'SUPABASE_READY',
    metadata: { ...ctx.metadata, supabaseAnonKey: keys.anonKey, supabaseServiceKey: keys.serviceKey },
  };
}

// NEW: Configure Supabase auth with actual Vercel URL (called after Vercel deployment)
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
    } else {
      console.log(`[supabase] Auth configured successfully for ${vercelUrl}`);
    }
  } catch (err) {
    console.error('[supabase] Auth config error:', err);
  }
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