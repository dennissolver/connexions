// app/api/setup/start/route.ts
import { NextResponse } from 'next/server';
import { runOrchestrator } from '@/lib/provisioning/orchestrator';

export async function POST(req: Request) {
  const { platformId } = await req.json();

  const publicBaseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_BASE_URL ??
    'http://localhost:3000';

  // fire and forget
  runOrchestrator(platformId, publicBaseUrl);

  return NextResponse.json({ ok: true });
}
