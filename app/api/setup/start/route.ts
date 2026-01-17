import { NextRequest, NextResponse } from 'next/server';
import { updateProvisionRunBySlug } from '@/lib/provisioning/store';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { projectSlug, state } = body;

  if (!projectSlug || !state) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  await updateProvisionRunBySlug(projectSlug, { state });
  return NextResponse.json({ success: true });
}
