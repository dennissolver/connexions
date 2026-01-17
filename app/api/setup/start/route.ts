import { NextResponse } from 'next/server';
import { createProvisionRun } from '@/lib/provisioning/store';
import { runProvisioning } from '@/lib/provisioning/orchestrator';

export async function POST(req: Request) {
  const { projectSlug } = await req.json();

  await createProvisionRun(projectSlug);

  // fire-and-forget
  runProvisioning(projectSlug);

  return NextResponse.json({ ok: true });
}
