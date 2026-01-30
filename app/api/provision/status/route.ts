// app/api/provision/status/route.ts
import { NextResponse } from 'next/server';
import { getProvisionRunBySlug } from '@/lib/provisioning/store';

// Fields to NEVER expose to the frontend
const SENSITIVE_KEYS = [
  'supabase_service_role_key',
  'supabase_anon_key',
  'db_password',
  'api_key',
  'secret',
  'token',
  'elevenlabs_api_key',
];

function sanitizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  if (!metadata) return {};
  
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(metadata)) {
    // Skip any key containing sensitive patterns
    const isSecret = SENSITIVE_KEYS.some(
      sensitive => key.toLowerCase().includes(sensitive.toLowerCase())
    );
    
    if (!isSecret) {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const projectSlug = searchParams.get('projectSlug');
  
  if (!projectSlug) {
    return NextResponse.json({ error: 'Missing projectSlug' }, { status: 400 });
  }
  
  const run = await getProvisionRunBySlug(projectSlug);
  
  if (!run) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  
  // Return sanitized version - never expose secrets
  return NextResponse.json({
    ...run,
    metadata: sanitizeMetadata(run.metadata as Record<string, unknown>),
  });
}