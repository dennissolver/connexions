// app/api/provision/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getProvisionRun } from '@/lib/provisioning/engine';

export async function GET(req: NextRequest) {
  const projectSlug = req.nextUrl.searchParams.get('projectSlug');

  if (!projectSlug) {
    return NextResponse.json({ error: 'Missing projectSlug' }, { status: 400 });
  }

  try {
    const run = await getProvisionRun(projectSlug);

    if (!run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }

    return NextResponse.json({ run });
  } catch (err: any) {
    console.error('Provision status error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}