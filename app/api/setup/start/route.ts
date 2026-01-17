// app/api/setup/start/route.ts

import { NextResponse } from 'next/server';
import { createProvisionRun, getProvisionRunBySlug } from '@/lib/provisioning/store';
import { runProvisioning } from '@/lib/provisioning/orchestrator';
import { generateProjectSlug } from '@/lib/utils/generateProjectSlug';

export async function POST(req: Request) {
  let payload: any;

  try {
    payload = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const platformName = payload?.platformName;

  if (!platformName || typeof platformName !== 'string') {
    return NextResponse.json(
      { error: 'platformName is required' },
      { status: 400 }
    );
  }

  // 🔐 Server-generated slug
  let projectSlug: string;
  let attempts = 0;

  while (true) {
    projectSlug = generateProjectSlug(platformName);
    const existing = await getProvisionRunBySlug(projectSlug);
    if (!existing) break;
    attempts++;
    if (attempts > 5) {
      return NextResponse.json(
        { error: 'Failed to generate unique project slug' },
        { status: 500 }
      );
    }
  }

  await createProvisionRun({
    projectSlug,
    initialState: 'SUPABASE_CREATING',
    setupPayload: payload, // 🔥 FULL payload persisted
  });

  // Fire-and-forget orchestration
  runProvisioning(projectSlug).catch((err) => {
    console.error('[Provisioning] Orchestrator error:', err);
  });

  return NextResponse.json({
    ok: true,
    projectSlug,
  });
}
