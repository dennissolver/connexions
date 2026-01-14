// app/api/cron/health/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ok: true,
    cron: 'provision',
    time: new Date().toISOString(),
  });
}

