import { NextRequest, NextResponse } from 'next/server';
import { deleteProvisionRunBySlug } from '@/lib/provisioning/store';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { projectSlug } = body;

  if (!projectSlug) {
    return NextResponse.json({ error: 'Missing projectSlug' }, { status: 400 });
  }

  await deleteProvisionRunBySlug(projectSlug);
  return NextResponse.json({ success: true });
}
