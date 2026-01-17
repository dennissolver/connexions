// app/api/setup/start/route.ts

import { NextResponse } from 'next/server';
import { createProvisionRun } from '@/lib/provisioning/store';
import { runProvisioning } from '@/lib/provisioning/orchestrator';

export async function POST(req: Request) {
  let body: unknown;

  // 1. Parse JSON defensively
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid or missing JSON body' },
      { status: 400 }
    );
  }

  // 2. Validate shape safely
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

  const projectSlug = (body as any).projectSlug;

  // 3. Create provisioning run
  await createProvisionRun({
    projectSlug,
    initialState: 'SUPABASE_CREATING',
    metadata: {},
  });

  // 4. Fire-and-forget orchestrator
  runProvisioning(projectSlug).catch((err) => {
    console.error('[Provisioning] Orchestrator error:', err);
  });

  // 5. Respond immediately
  return NextResponse.json({ ok: true });
}
