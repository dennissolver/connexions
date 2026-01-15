// lib/provisioning/steps/supabase.ts

import { ProvisionContext, ProvisionStepResult } from '../types';

const SUPABASE_API = 'https://api.supabase.com/v1';

const CHILD_SCHEMA = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

CREATE TABLE IF NOT EXISTS interviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  source TEXT DEFAULT 'voice',
  interviewee_name TEXT,
  interviewee_email TEXT,
  interviewee_profile JSONB DEFAULT '{}',
  conversation_id TEXT,
  messages JSONB DEFAULT '[]',
  transcript TEXT,
  transcript_url TEXT,
  summary TEXT,
  feedback JSONB DEFAULT '{}',
  extracted_data JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_seconds INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agents_slug ON agents(slug);
CREATE INDEX IF NOT EXISTS idx_interviews_agent_id ON interviews(agent_id);
CREATE INDEX IF NOT EXISTS idx_interviews_status ON interviews(status);
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

  // Check for existing
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

  // Create new
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

  // Check ready
  const res = await fetch(`${SUPABASE_API}/projects/${projectRef}`, {
    headers: { Authorization: `Bearer ${ctx.supabaseToken}` },
  });
  if (!res.ok) return { nextState: 'SUPABASE_CREATING', metadata: ctx.metadata };

  const project = await res.json();
  if (project.status !== 'ACTIVE_HEALTHY') {
    return { nextState: 'SUPABASE_CREATING', metadata: ctx.metadata };
  }

  // Get keys
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

  // Configure auth
  const vercelUrl = `https://${ctx.projectSlug}.vercel.app`;
  await fetch(`${SUPABASE_API}/projects/${projectRef}/config/auth`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${ctx.supabaseToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      site_url: vercelUrl,
      uri_allow_list: [`${vercelUrl}/**`, 'http://localhost:3000/**'],
      redirect_urls: [`${vercelUrl}/auth/callback`, 'http://localhost:3000/auth/callback'],
    }),
  }).catch(() => {});

  return {
    nextState: 'SUPABASE_READY',
    metadata: { ...ctx.metadata, supabaseAnonKey: keys.anonKey, supabaseServiceKey: keys.serviceKey },
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