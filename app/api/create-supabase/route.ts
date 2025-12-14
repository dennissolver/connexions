// app/api/setup/create-supabase/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function POST(request: NextRequest) {
  try {
    const { projectName } = await request.json();

    if (!projectName) {
      return NextResponse.json({ error: 'Project name required' }, { status: 400 });
    }

    const supabaseAccessToken = process.env.SUPABASE_ACCESS_TOKEN;
    const supabaseOrgId = process.env.SUPABASE_ORG_ID;

    if (!supabaseAccessToken || !supabaseOrgId) {
      return NextResponse.json(
        { error: 'SUPABASE_ACCESS_TOKEN and SUPABASE_ORG_ID required' },
        { status: 500 }
      );
    }

    const safeName = projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 40);
    const dbPassword = generatePassword();

    // ========== Step 1: Create Supabase Project ==========
    console.log('Creating Supabase project:', safeName);

    const createRes = await fetch('https://api.supabase.com/v1/projects', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${supabaseAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: safeName,
        organization_id: supabaseOrgId,
        region: 'ap-southeast-2', // Sydney - closest to AU
        plan: 'free',
        db_pass: dbPassword,
      }),
    });

    if (!createRes.ok) {
      const error = await createRes.json();
      console.error('Supabase creation failed:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to create Supabase project' },
        { status: 400 }
      );
    }

    const project = await createRes.json();
    const projectRef = project.id;
    console.log('Supabase project created:', projectRef);

    // ========== Step 2: Wait for Project Ready ==========
    console.log('Waiting for project to be ready...');
    await waitForProjectReady(supabaseAccessToken, projectRef);

    // ========== Step 3: Get API Keys ==========
    const keysRes = await fetch(
      `https://api.supabase.com/v1/projects/${projectRef}/api-keys`,
      { headers: { Authorization: `Bearer ${supabaseAccessToken}` } }
    );

    const keys = await keysRes.json();
    const anonKey = keys.find((k: any) => k.name === 'anon')?.api_key;
    const serviceKey = keys.find((k: any) => k.name === 'service_role')?.api_key;

    if (!anonKey || !serviceKey) {
      return NextResponse.json({ error: 'Failed to get API keys' }, { status: 500 });
    }

    const supabaseUrl = `https://${projectRef}.supabase.co`;

    // ========== Step 4: Run Schema Migration ==========
    console.log('Running schema migration...');
    await runMigration(supabaseAccessToken, projectRef);

    // ========== Step 5: Create Storage Buckets ==========
    console.log('Creating storage buckets...');
    await createStorageBuckets(supabaseUrl, serviceKey);

    return NextResponse.json({
      success: true,
      projectId: projectRef,
      url: supabaseUrl,
      anonKey,
      serviceKey,
    });

  } catch (error: any) {
    console.error('Create Supabase error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create Supabase project' },
      { status: 500 }
    );
  }
}

function generatePassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 24; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

async function waitForProjectReady(token: string, projectRef: string, maxWait = 120000): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWait) {
    const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const project = await res.json();

    if (project.status === 'ACTIVE_HEALTHY') {
      console.log('Project is ready!');
      return;
    }

    console.log(`Project status: ${project.status}, waiting...`);
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  throw new Error('Timeout waiting for project to be ready');
}

async function runMigration(token: string, projectRef: string): Promise<void> {
  const schema = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  company_name TEXT,
  subscription_tier TEXT DEFAULT 'free',
  agents_limit INT DEFAULT 3,
  interviews_limit INT DEFAULT 100,
  setup_data JSONB DEFAULT '{}',
  branding JSONB DEFAULT '{"primary_color": "#7C3AED", "background_color": "#0F172A"}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agents table
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'active',
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
  primary_color TEXT DEFAULT '#7C3AED',
  background_color TEXT DEFAULT '#0F172A',
  total_interviews INT DEFAULT 0,
  completed_interviews INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interviews table
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_agents_client_id ON agents(client_id);
CREATE INDEX IF NOT EXISTS idx_agents_slug ON agents(slug);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_interviews_agent_id ON interviews(agent_id);
CREATE INDEX IF NOT EXISTS idx_interviews_status ON interviews(status);
CREATE INDEX IF NOT EXISTS idx_interviews_conversation ON interviews(conversation_id);

-- Helper function
CREATE OR REPLACE FUNCTION increment_agent_interviews(agent_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE agents SET total_interviews = total_interviews + 1 WHERE id = agent_uuid;
END;
$$ LANGUAGE plpgsql;
  `;

  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: schema }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    console.warn('Migration warning:', error);
    // Don't throw - might already exist
  } else {
    console.log('Schema migration complete');
  }
}

async function createStorageBuckets(supabaseUrl: string, serviceKey: string): Promise<void> {
  const buckets = [
    { name: 'transcripts', public: false, fileSizeLimit: 10485760 }, // 10MB
    { name: 'recordings', public: false, fileSizeLimit: 104857600 }, // 100MB
    { name: 'exports', public: false, fileSizeLimit: 52428800 }, // 50MB
    { name: 'assets', public: true, fileSizeLimit: 5242880 }, // 5MB
  ];

  for (const bucket of buckets) {
    try {
      const res = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
          apikey: serviceKey,
        },
        body: JSON.stringify({
          id: bucket.name,
          name: bucket.name,
          public: bucket.public,
          file_size_limit: bucket.fileSizeLimit,
          allowed_mime_types: bucket.name === 'assets' 
            ? ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml']
            : bucket.name === 'recordings'
            ? ['audio/mpeg', 'audio/wav', 'audio/webm', 'audio/ogg']
            : ['application/json', 'text/plain', 'text/csv', 'application/pdf'],
        }),
      });

      if (res.ok) {
        console.log(`Created bucket: ${bucket.name}`);
      } else {
        const error = await res.json().catch(() => ({}));
        // Bucket might already exist
        if (!error.message?.includes('already exists')) {
          console.warn(`Bucket ${bucket.name} warning:`, error);
        }
      }
    } catch (err) {
      console.warn(`Bucket ${bucket.name} error:`, err);
    }
  }
}
