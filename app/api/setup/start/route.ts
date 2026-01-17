import { NextRequest, NextResponse } from 'next/server';
import { updateProvisionRun } from '@/lib/provisioning/engine';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { projectSlug } = body;

  if (!projectSlug) {
    return NextResponse.json({ error: 'Missing projectSlug' }, { status: 400 });
  }

  await updateProvisionRun(projectSlug, { state: 'INIT' });
  return NextResponse.json({ success: true });
}
