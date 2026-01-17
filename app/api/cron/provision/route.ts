// app/api/cron/provision/route.ts
// Cron job to poll and resume active provisioning runs
// Set up in vercel.json to run every 1-2 minutes

import { NextResponse } from 'next/server';
import { processActiveRuns } from '@/lib/provisioning/orchestrator';

// Verify cron secret to prevent unauthorized calls
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: Request) {
  // Verify the request is from Vercel Cron or has the secret
  const authHeader = req.headers.get('authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await processActiveRuns();

    console.log(`[cron/provision] Processed ${result.processed} runs: ${result.completed} completed, ${result.failed} failed, ${result.running} still running`);

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (err) {
    console.error('[cron/provision] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggers
export async function POST(req: Request) {
  return GET(req);
}