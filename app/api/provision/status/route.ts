import { NextRequest, NextResponse } from 'next/server';
import { getProvisionRunBySlug } from '@/lib/provisioning/engine';

export async function GET(req: NextRequest) {
  const projectSlug = req.nextUrl.searchParams.get('projectSlug');
  if (!projectSlug) {
    return NextResponse.json({ error: 'Missing projectSlug' }, { status: 400 });
  }

  const run = await getProvisionRunBySlug(projectSlug);
  if (!run) {
    return NextResponse.json({ error: 'Run not found' }, { status: 404 });
  }

  return NextResponse.json(run);
}
