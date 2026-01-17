import { NextResponse } from 'next/server';
import { getProvisionRunBySlug } from '@/lib/provisioning/store';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const projectSlug = searchParams.get('projectSlug')!;

  const run = await getProvisionRunBySlug(projectSlug);
  return NextResponse.json(run);
}
