// app/api/setup/start/route.ts
import { NextResponse } from 'next/server';
import { createProvisionRun } from '@/lib/provisioning/engine';
import { runOrchestrator } from '@/lib/provisioning/orchestrator';

export async function POST(req: Request) {
  console.log('[setup/start] Received request');

  try {
    const body = await req.json();
    console.log('[setup/start] Body:', JSON.stringify(body));

    const {
      platformName,
      companyName,
      contactEmail,
      ownerName,
      ownerRole,
      voicePreference,
    } = body;

    // Validate required fields
    if (!platformName || !companyName || !contactEmail) {
      console.log('[setup/start] Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields: platformName, companyName, contactEmail' },
        { status: 400 }
      );
    }

    // Generate project slug from platform name
    const projectSlug = platformName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50);

    console.log('[setup/start] Generated projectSlug:', projectSlug);

    const publicBaseUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      process.env.NEXT_PUBLIC_BASE_URL ??
      'https://connexions-silk.vercel.app';

    console.log('[setup/start] Using publicBaseUrl:', publicBaseUrl);

    // Create provision run first (synchronously)
    try {
      const run = await createProvisionRun(projectSlug, platformName, companyName);
      console.log('[setup/start] Created provision run:', run.id);
    } catch (dbError: any) {
      console.error('[setup/start] DB error creating provision run:', dbError.message);
      return NextResponse.json(
        { error: `Database error: ${dbError.message}` },
        { status: 500 }
      );
    }

    // Fire and forget the orchestrator (don't await)
    runOrchestrator(projectSlug, publicBaseUrl).catch(err => {
      console.error(`[setup/start] Orchestrator error for ${projectSlug}:`, err.message);
    });

    console.log('[setup/start] Returning success with projectSlug:', projectSlug);

    // Return the projectSlug so the page can redirect to provision status
    return NextResponse.json({
      ok: true,
      projectSlug: projectSlug,
      message: 'Provisioning started'
    });

  } catch (err: any) {
    console.error('[setup/start] Unexpected error:', err.message, err.stack);
    return NextResponse.json(
      { error: err.message || 'Failed to start provisioning' },
      { status: 500 }
    );
  }
}