import { NextResponse } from 'next/server';
import { deleteProvisionRunBySlug } from '@/lib/provisioning/store';

export async function POST(req: Request) {
  const { projectSlug } = await req.json();
  await deleteProvisionRunBySlug(projectSlug);
  return NextResponse.json({ ok: true });
}
