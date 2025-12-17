// app/api/setup/create-supabase/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Accept either platformName or projectName
    const platformName = body.platformName || body.projectName;

    if (!platformName) {
      return NextResponse.json({ error: 'Platform name required' }, { status: 400 });
    }

    const supabaseAccessToken = process.env.SUPABASE_ACCESS_TOKEN;
    const supabaseOrgId = process.env.SUPABASE_ORG_ID;

    if (!supabaseAccessToken || !supabaseOrgId) {
      return NextResponse.json(
        { error: 'SUPABASE_ACCESS_TOKEN and SUPABASE_ORG_ID required' },
        { status: 500 }
      );
    }

    const safeName = platformName.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 40);
    const inferredVercelUrl = `https://${safeName}.vercel.app`;

    // ========== Check if project already exists ==========
    console.log('Checking for existing Supabase project:', safeName);

    const listRes = await fetch('https://api.supabase.com/v1/projects', {
      headers: { Authorization: `Bearer ${supabaseAccessToken}` },
    });

    const projects = await listRes.json();
    const existing = projects.find((p: any) => p.name === safeName);

    if (existing) {
      console.log('Found existing project:', existing.id);

      const keysRes = await fetch(
        `https://api.supabase.com/v1/projects/${existing.id}/api-keys`,
        { headers: { Authorization: `Bearer ${supabaseAccessToken}` } }
      );

      const keys = await keysRes.json();
      const anonKey = keys.find((k: any) => k.name === 'anon')?.api_key;
      const serviceKey = keys.find((k: any) => k.name === 'service_role')?.api_key;

      await configureAuthUrls(supabaseAccessToken, existing.id, inferredVercelUrl);

      return NextResponse.json({
        success: true,
        projectId: existing.id,
        url: `https://${existing.id}.supabase.co`,
        anonKey,
        serviceKey,
        vercelUrl: inferredVercelUrl,
        alreadyExists: true,
      });
    }

    // ========== Create new project ==========
    const dbPassword = generatePassword();
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
        region: 'ap-southeast-2',
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

    // Wait for project ready
    console.log('Waiting for project to be ready...');
    await waitForProjectReady(supabaseAccessToken, projectRef);

    // Get API keys
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

    // Run schema migration
    console.log('Running schema migration...');
    await runMigration(supabaseAccessToken, projectRef);

    // Create storage buckets
    console.log('Creating storage buckets...');
    await createStorageBuckets(supabaseUrl, serviceKey);

    // Configure auth URLs
    console.log('Configuring auth URLs...');
    await configureAuthUrls(supabaseAccessToken, projectRef, inferredVercelUrl);

    return NextResponse.json({
      success: true,
      projectId: projectRef,
      url: supabaseUrl,
      anonKey,
      serviceKey,
      vercelUrl: inferredVercelUrl,
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

async function waitForProjectReady(token: string, projectRef: string, maxWait = 180000): Promise<void> {
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

async function configureAuthUrls(token: string, projectRef: string, vercelUrl: string): Promise<void> {
  try {
    const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        site_url: vercelUrl,
        uri_allow_list: [
          `${vercelUrl}/**`,
          `${vercelUrl}`,
          'http://localhost:3000/**',
          'http://localhost:3000',
        ],
        redirect_urls: [
          `${vercelUrl}/auth/callback`,
          `${vercelUrl}/`,
          'http://localhost:3000/auth/callback',
          'http://localhost:3000/',
        ],
      }),
    });

    if (res.ok) {
      console.log('Auth URLs configured:', vercelUrl);
    } else {
      const error = await res.json().catch(() => ({}));
      console.warn('Auth URL config warning:', error);
    }
  } catch (err) {
    console.warn('Could not configure auth URLs:', err);
  }
}

async function runMigration(token: string, projectRef: string): Promise<void> {
  const schema = `
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
  branding JSONB DEFAULT '{}',
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
  transcript_received BOOLEAN DEFAULT FALSE,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_seconds INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interview transcripts table (for ElevenLabs webhook data)
CREATE TABLE IF NOT EXISTS interview_transcripts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  interview_id UUID REFERENCES interviews(id) ON DELETE CASCADE,
  elevenlabs_conversation_id TEXT UNIQUE,
  elevenlabs_agent_id TEXT,
  transcript JSONB,
  analysis JSONB,
  metadata JSONB,
  status TEXT,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  forwarded_to_parent BOOLEAN DEFAULT FALSE,
  forwarded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_agents_client_id ON agents(client_id);
CREATE INDEX IF NOT EXISTS idx_agents_slug ON agents(slug);
CREATE INDEX IF NOT EXISTS idx_agents_elevenlabs ON agents(elevenlabs_agent_id);
CREATE INDEX IF NOT EXISTS idx_interviews_agent_id ON interviews(agent_id);
CREATE INDEX IF NOT EXISTS idx_interviews_status ON interviews(status);
CREATE INDEX IF NOT EXISTS idx_interviews_started ON interviews(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_interview_transcripts_interview ON interview_transcripts(interview_id);
CREATE INDEX IF NOT EXISTS idx_interview_transcripts_conversation ON interview_transcripts(elevenlabs_conversation_id);

-- Enable RLS on all tables
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_transcripts ENABLE ROW LEVEL SECURITY;

-- Service role policies (full access for backend)
CREATE POLICY "Service role full access to clients" ON clients
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to agents" ON agents
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to interviews" ON interviews
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to interview_transcripts" ON interview_transcripts
  FOR ALL USING (auth.role() = 'service_role');

-- Public read access for agents (for interview pages)
CREATE POLICY "Public read access to active agents" ON agents
  FOR SELECT USING (status = 'active');
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
    const error = await res.text();
    console.warn('Migration warning:', error);
  } else {
    console.log('Schema migration complete');
  }
}

async function createStorageBuckets(supabaseUrl: string, serviceKey: string): Promise<void> {
  const buckets = ['transcripts', 'recordings', 'exports', 'assets'];

  for (const name of buckets) {
    try {
      await fetch(`${supabaseUrl}/storage/v1/bucket`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
          apikey: serviceKey,
        },
        body: JSON.stringify({
          id: name,
          name: name,
          public: name === 'assets',
        }),
      });
      console.log(`Created bucket: ${name}`);
    } catch (err) {
      console.warn(`Bucket ${name} may already exist`);
    }
  }
}