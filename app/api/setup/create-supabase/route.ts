// app/api/setup/create-supabase/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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

    if (!listRes.ok) {
      const errorText = await listRes.text();
      console.error('Failed to list projects:', listRes.status, errorText.slice(0, 200));
      return NextResponse.json({ error: 'Failed to list Supabase projects' }, { status: 500 });
    }

    const projects = await listRes.json();
    const existing = projects.find((p: any) => p.name === safeName);

    if (existing) {
      console.log('Found existing project:', existing.id);

      // Fetch keys with retry for existing project
      const keys = await fetchApiKeysWithRetry(supabaseAccessToken, existing.id);
      if (!keys) {
        return NextResponse.json({ error: 'Failed to fetch API keys for existing project' }, { status: 500 });
      }

      const anonKey = keys.find((k: any) => k.name === 'anon')?.api_key;
      const serviceKey = keys.find((k: any) => k.name === 'service_role')?.api_key;

      if (!anonKey || !serviceKey) {
        return NextResponse.json({ error: 'API keys not found for existing project' }, { status: 500 });
      }

      // Run migration on existing project (to add any missing tables)
      console.log('Ensuring schema is up to date...');
      await runMigration(supabaseAccessToken, existing.id);

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
      const error = await createRes.json().catch(() => ({}));
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

    // Get API keys with retry (keys endpoint can lag behind project status)
    console.log('Fetching API keys...');
    const keys = await fetchApiKeysWithRetry(supabaseAccessToken, projectRef);
    if (!keys) {
      return NextResponse.json({ error: 'Failed to fetch API keys after retries' }, { status: 500 });
    }

    const anonKey = keys.find((k: any) => k.name === 'anon')?.api_key;
    const serviceKey = keys.find((k: any) => k.name === 'service_role')?.api_key;
    const supabaseUrl = `https://${projectRef}.supabase.co`;

    if (!anonKey || !serviceKey) {
      return NextResponse.json({ error: 'Failed to get API keys' }, { status: 500 });
    }

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

// ============================================================================
// DELETE - Remove Supabase project
// ============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const { projectId, projectRef, projectName } = await request.json();

    const supabaseAccessToken = process.env.SUPABASE_ACCESS_TOKEN;

    if (!supabaseAccessToken) {
      return NextResponse.json({ error: 'SUPABASE_ACCESS_TOKEN not configured' }, { status: 500 });
    }

    // Try to find project by ID, ref, or name
    let idToDelete = projectId || projectRef;

    // If we only have a name, look up the project ID
    if (!idToDelete && projectName) {
      console.log('[Cleanup] Looking up Supabase project by name:', projectName);

      const listRes = await fetch('https://api.supabase.com/v1/projects', {
        headers: { Authorization: `Bearer ${supabaseAccessToken}` },
      });

      if (listRes.ok) {
        const projects = await listRes.json();
        const safeName = projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 40);
        const found = projects.find((p: any) => p.name === safeName || p.id === projectName);

        if (found) {
          idToDelete = found.id;
        }
      }
    }

    if (!idToDelete) {
      console.log('[Cleanup] No Supabase project identifier provided');
      return NextResponse.json({ success: true, alreadyDeleted: true });
    }

    console.log('[Cleanup] Deleting Supabase project:', idToDelete);

    // Check if project exists
    const checkRes = await fetch(`https://api.supabase.com/v1/projects/${idToDelete}`, {
      headers: { Authorization: `Bearer ${supabaseAccessToken}` },
    });

    if (!checkRes.ok) {
      console.log('[Cleanup] Supabase project not found:', idToDelete);
      return NextResponse.json({ success: true, alreadyDeleted: true });
    }

    // Delete the project
    const deleteRes = await fetch(`https://api.supabase.com/v1/projects/${idToDelete}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${supabaseAccessToken}` },
    });

    if (!deleteRes.ok && deleteRes.status !== 404) {
      const error = await deleteRes.json().catch(() => ({}));
      console.error('[Cleanup] Failed to delete Supabase project:', error);
      return NextResponse.json({ error: 'Failed to delete project' }, { status: 400 });
    }

    console.log('[Cleanup] Supabase project deleted:', idToDelete);
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('[Cleanup] Supabase delete error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generatePassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 24; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

async function fetchApiKeysWithRetry(token: string, projectRef: string, maxAttempts = 5): Promise<any[] | null> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(
        `https://api.supabase.com/v1/projects/${projectRef}/api-keys`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) {
        const errorText = await res.text();
        console.warn(`API keys fetch failed (attempt ${attempt}/${maxAttempts}):`, res.status, errorText.slice(0, 200));
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 3000));
          continue;
        }
        return null;
      }

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        console.warn(`API keys returned non-JSON (attempt ${attempt}/${maxAttempts}):`, contentType);
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 3000));
          continue;
        }
        return null;
      }

      const keys = await res.json();
      console.log(`API keys fetched successfully (attempt ${attempt})`);
      return keys;

    } catch (err) {
      console.warn(`API keys fetch error (attempt ${attempt}/${maxAttempts}):`, err);
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        continue;
      }
      return null;
    }
  }
  return null;
}

async function waitForProjectReady(token: string, projectRef: string, maxWait = 180000): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWait) {
    const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      console.warn('Project status check failed:', res.status);
      await new Promise(resolve => setTimeout(resolve, 5000));
      continue;
    }

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
-- ============================================================================
-- CHILD PLATFORM SCHEMA v2.0
-- Complete database schema for AI Interview child platforms
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Function for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CLIENTS TABLE
-- ============================================================================
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

-- ============================================================================
-- TEMPLATES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  questions JSONB DEFAULT '[]',
  settings JSONB DEFAULT '{}',
  greeting TEXT,
  closing_message TEXT,
  estimated_duration_mins INT DEFAULT 10,
  is_public BOOLEAN DEFAULT false,
  use_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- AGENTS TABLE (Interview Panels)
-- ============================================================================
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  greeting TEXT DEFAULT 'Hello! Thanks for joining this interview.',
  questions JSONB DEFAULT '[]',
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
  avg_duration_seconds INT,
  avg_score DECIMAL(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generate slug from name if not provided
CREATE OR REPLACE FUNCTION generate_agent_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := lower(regexp_replace(NEW.name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(NEW.id::text, 1, 8);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_agent_slug ON agents;
CREATE TRIGGER trigger_generate_agent_slug
  BEFORE INSERT ON agents
  FOR EACH ROW
  EXECUTE FUNCTION generate_agent_slug();

-- ============================================================================
-- INTERVIEWS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS interviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  interviewee_id UUID,
  status TEXT DEFAULT 'pending',
  source TEXT DEFAULT 'voice',
  -- Participant Demographics
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  mobile TEXT,
  company_name TEXT,
  city TEXT,
  state TEXT,
  -- Legacy fields (kept for compatibility)
  interviewee_name TEXT,
  interviewee_email TEXT,
  interviewee_profile JSONB DEFAULT '{}',
  -- Conversation Data
  conversation_id TEXT,
  elevenlabs_conversation_id TEXT,
  messages JSONB DEFAULT '[]',
  transcript TEXT,
  transcript_url TEXT,
  audio_url TEXT,
  summary TEXT,
  feedback JSONB DEFAULT '{}',
  extracted_data JSONB DEFAULT '{}',
  extracted_answers JSONB DEFAULT '{}',
  transcript_received BOOLEAN DEFAULT FALSE,
  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_seconds INT,
  -- Notifications
  notification_sent BOOLEAN DEFAULT FALSE,
  notification_sent_at TIMESTAMPTZ,
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_interviews_agent_id ON interviews(agent_id);
CREATE INDEX IF NOT EXISTS idx_interviews_email ON interviews(email);
CREATE INDEX IF NOT EXISTS idx_interviews_status ON interviews(status);

-- ============================================================================
-- RESPONSES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  interview_id UUID REFERENCES interviews(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  question_index INT,
  question_text TEXT,
  answer_text TEXT,
  answer_duration_seconds INT,
  sentiment TEXT,
  sentiment_score DECIMAL(3,2),
  key_points TEXT[],
  entities JSONB DEFAULT '{}',
  follow_up_needed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INTERVIEW TRANSCRIPTS TABLE
-- ============================================================================
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

-- ============================================================================
-- INTERVIEWEES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS interviewees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  custom_field TEXT,
  custom_data JSONB DEFAULT '{}',
  invite_token TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'invited',
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
-- EVALUATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS evaluations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  interview_id UUID REFERENCES interviews(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  goal_achievement_score DECIMAL(3,2),
  conversation_quality_score DECIMAL(3,2),
  user_engagement_score DECIMAL(3,2),
  prompt_adherence_score DECIMAL(3,2),
  overall_score DECIMAL(3,2),
  insights JSONB DEFAULT '{}',
  strengths TEXT[],
  weaknesses TEXT[],
  recommendations TEXT[],
  flags TEXT[],
  evaluated_by TEXT DEFAULT 'parent_platform',
  evaluated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- EMAIL LOGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  interviewee_id UUID REFERENCES interviewees(id) ON DELETE SET NULL,
  interview_id UUID REFERENCES interviews(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  email_type TEXT NOT NULL,
  to_email TEXT NOT NULL,
  to_name TEXT,
  subject TEXT,
  template_used TEXT,
  status TEXT DEFAULT 'pending',
  provider TEXT DEFAULT 'resend',
  provider_id TEXT,
  error TEXT,
  metadata JSONB DEFAULT '{}',
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- WEBHOOK LOGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source TEXT NOT NULL,
  event_type TEXT,
  endpoint TEXT,
  method TEXT DEFAULT 'POST',
  headers JSONB DEFAULT '{}',
  payload JSONB,
  status TEXT DEFAULT 'received',
  status_code INT,
  response JSONB,
  error TEXT,
  processing_time_ms INT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_templates_client_id ON templates(client_id);
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);
CREATE INDEX IF NOT EXISTS idx_agents_client_id ON agents(client_id);
CREATE INDEX IF NOT EXISTS idx_agents_slug ON agents(slug);
CREATE INDEX IF NOT EXISTS idx_agents_elevenlabs ON agents(elevenlabs_agent_id);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_interviews_agent_id ON interviews(agent_id);
CREATE INDEX IF NOT EXISTS idx_interviews_status ON interviews(status);
CREATE INDEX IF NOT EXISTS idx_interviews_started ON interviews(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_responses_interview_id ON responses(interview_id);
CREATE INDEX IF NOT EXISTS idx_responses_agent_id ON responses(agent_id);
CREATE INDEX IF NOT EXISTS idx_interview_transcripts_interview ON interview_transcripts(interview_id);
CREATE INDEX IF NOT EXISTS idx_interview_transcripts_conversation ON interview_transcripts(elevenlabs_conversation_id);
CREATE INDEX IF NOT EXISTS idx_interviewees_agent_id ON interviewees(agent_id);
CREATE INDEX IF NOT EXISTS idx_interviewees_email ON interviewees(email);
CREATE INDEX IF NOT EXISTS idx_interviewees_invite_token ON interviewees(invite_token);
CREATE INDEX IF NOT EXISTS idx_interviewees_status ON interviewees(status);
CREATE INDEX IF NOT EXISTS idx_evaluations_interview_id ON evaluations(interview_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_agent_id ON evaluations(agent_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_interviewee ON email_logs(interviewee_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_source ON webhook_logs(source);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_status ON webhook_logs(status);

-- ============================================================================
-- TRIGGERS
-- ============================================================================
DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_templates_updated_at ON templates;
CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON templates FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_agents_updated_at ON agents;
CREATE TRIGGER update_agents_updated_at
  BEFORE UPDATE ON agents FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_interviewees_updated_at ON interviewees;
CREATE TRIGGER update_interviewees_updated_at
  BEFORE UPDATE ON interviewees FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviewees ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (idempotent)
DROP POLICY IF EXISTS "Allow all on clients" ON clients;
DROP POLICY IF EXISTS "Allow all on templates" ON templates;
DROP POLICY IF EXISTS "Allow all on agents" ON agents;
DROP POLICY IF EXISTS "Allow all on interviews" ON interviews;
DROP POLICY IF EXISTS "Allow all on responses" ON responses;
DROP POLICY IF EXISTS "Allow all on interview_transcripts" ON interview_transcripts;
DROP POLICY IF EXISTS "Allow all on interviewees" ON interviewees;
DROP POLICY IF EXISTS "Allow all on evaluations" ON evaluations;
DROP POLICY IF EXISTS "Allow all on email_logs" ON email_logs;
DROP POLICY IF EXISTS "Allow all on webhook_logs" ON webhook_logs;

-- Simple allow-all policies
CREATE POLICY "Allow all on clients" ON clients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on templates" ON templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on agents" ON agents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on interviews" ON interviews FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on responses" ON responses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on interview_transcripts" ON interview_transcripts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on interviewees" ON interviewees FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on evaluations" ON evaluations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on email_logs" ON email_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on webhook_logs" ON webhook_logs FOR ALL USING (true) WITH CHECK (true);
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
  const buckets = [
    { name: 'transcripts', public: false },
    { name: 'recordings', public: false },
    { name: 'exports', public: false },
    { name: 'assets', public: true },
    { name: 'attachments', public: false },
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
        }),
      });

      if (res.ok) {
        console.log(`Created bucket: ${bucket.name}`);
      } else {
        const error = await res.text();
        if (error.includes('already exists')) {
          console.log(`Bucket ${bucket.name} already exists`);
        } else {
          console.warn(`Bucket ${bucket.name} creation warning:`, error.slice(0, 100));
        }
      }
    } catch (err) {
      console.warn(`Bucket ${bucket.name} error:`, err);
    }
  }
}