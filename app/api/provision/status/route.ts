// app/api/provision/status/route.ts
import { NextResponse } from 'next/server';
import { getProvisionRun } from '@/lib/provisioning/engine';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const platformId = searchParams.get('platformId');

  if (!platformId) {
    return NextResponse.json({ error: 'Missing platformId' }, { status: 400 });
  }

  const run = await getProvisionRun(platformId);
  if (!run) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({
    state: run.state,
    metadata: run.metadata ?? {},
  });
}
