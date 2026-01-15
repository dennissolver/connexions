// app/api/provision/status/route.ts.ts
import { NextRequest, NextResponse } from 'next/server';
import { getProvisionRun } from '@/lib/provisioning/engine';
import { runProvisioningStep } from '@/lib/provisioning/orchestrator';

export const maxDuration = 60; // Allow up to 60 seconds for each step

export async function GET(req: NextRequest) {
  const projectSlug = req.nextUrl.searchParams.get('projectSlug');

  if (!projectSlug) {
    return NextResponse.json({ error: 'Missing projectSlug' }, { status: 400 });
  }

  try {
    // Get current state
    let run = await getProvisionRun(projectSlug);

    if (!run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }

    // If not in terminal state, try to advance one step
    if (run.state !== 'COMPLETE' && run.state !== 'FAILED') {
      const publicBaseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://connexions-silk.vercel.app';

      try {
        console.log(`[provision/status] Running step for ${projectSlug}, current state: ${run.state}`);
        run = await runProvisioningStep(projectSlug, publicBaseUrl) || run;
        console.log(`[provision/status] After step, state: ${run.state}`);
      } catch (stepError: any) {
        console.error(`[provision/status] Step error:`, stepError.message);
        // Don't fail the request, just return current state
        // The error will be recorded in the run
        run = await getProvisionRun(projectSlug) || run;
      }
    }

    return NextResponse.json({ run });
  } catch (err: any) {
    console.error('[provision/status] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}