// app/api/provision/resume/route.ts
import { NextResponse } from 'next/server';
import { runProvisioning } from '@/lib/provisioning/orchestrator';

export async function POST(req: Request) {
  const { projectSlug } = await req.json();
  
  if (!projectSlug) {
    return NextResponse.json({ error: 'projectSlug required' }, { status: 400 });
  }

  const result = await runProvisioning(projectSlug);
  return NextResponse.json(result);
}
