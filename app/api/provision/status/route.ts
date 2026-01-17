import { NextRequest, NextResponse } from 'next/server';
import { getProvisionRunBySlug } from '@/lib/provisioning/store';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectSlug = searchParams.get('projectSlug');

  if (!projectSlug) {
    return NextResponse.json({ error: 'Missing projectSlug' }, { status: 400 });
  }

  const run = await getProvisionRunBySlug(projectSlug);
  if (!run) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(run);
}
