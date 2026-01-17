// app/api/setup/start/route.ts

import { NextResponse } from 'next/server';
import { createProvisionRun } from '@/lib/provisioning/store';
import { runProvisioning } from '@/lib/provisioning/orchestrator';

export async function POST(req: Request) {
  // 1. Enforce JSON content type
  const contentType = req.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return NextResponse.json(
      { error: 'Content-Type must be application/json' },
      { status: 400 }
    );
  }

  // 2. Parse body safely
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  // 3. Validate shape explicitly
  if (
    !body ||
    typeof body !== 'object' ||
    !('projectSlug' in body) ||
    typeof (body as any).projectSlug !== 'string'
  ) {
    return NextResponse.json(
      { error: 'projectSlug is required and must be a string' },
      { status: 400 }
    );
  }

  const { projectSlug } = body as { projectSlug: string };

  // 4. Create provisioning run (idempotent)
  await createProvisionRun({
    projectSlug,
    initialState: 'SUPABASE_CREATING',
    metadata: {},
  });

  // 5. Fire-and-forget orchestrator
  runProvisioning(projectSlug).catch((err) => {
    console.error('[Provisioning] Orchestrator error:', err);
  });

  // 6. Respond immediately
  return NextResponse.json({ ok: true });
}
