import { NextRequest, NextResponse } from 'next/server';
import { getProvisionRunBySlug, deleteProvisionRunBySlug } from '@/lib/provisioning/engine';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const projectSlug = body.projectSlug;

  if (!projectSlug) {
    return NextResponse.json({ error: 'Missing projectSlug' }, { status: 400 });
  }

  const run = await getProvisionRunBySlug(projectSlug);
  if (!run) {
    return NextResponse.json({ error: 'Run not found' }, { status: 404 });
  }

  await deleteProvisionRunBySlug(projectSlug);
  return NextResponse.json({ success: true });
}
