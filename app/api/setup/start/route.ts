// app/api/setup/start/route.ts

import { NextResponse } from 'next/server';
import { createProvisionRun } from '@/lib/provisioning/store';
import { runProvisioning } from '@/lib/provisioning/orchestrator';

export async function POST(req: Request) {
  let body: any;

  // 1. Safely parse JSON
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid or missing JSON body' },
      { status: 400 }
    );
  }

  // 2. Validate input
  const projectSlug = body?.projectSlug;

  if (!projectSlug || typeof projectSlug !== 'string') {
    return NextResponse.json(
      { error: 'projectSlug is required and must be a string' },
      { status: 400 }
    );
  }

  // 3. Create provisioning run (idempotent handled in store)
  await createProvisionRun({
    projectSlug,
    initialState: 'SUPABASE_CREATING',
    metadata: {},
  });

  // 4. Kick off async provisioning loop (fire-and-forget)
  runProvisioning(projectSlug).catch((err) => {
    console.error('[Provisioning] Orchestrator error:', err);
  });

  // 5. Respond immediately
  return NextResponse.json({ ok: true });
}
