// app/api/setup/start/route.ts
import { NextResponse } from 'next/server';
import { startProvisioning } from '@/lib/provisioning/orchestrator';

export async function POST(req: Request) {
  try {
    const body = await req.json();

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

    const publicBaseUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      process.env.NEXT_PUBLIC_BASE_URL ??
      'https://connexions.vercel.app';

    // Start provisioning (fire and forget with background orchestration)
    await startProvisioning(projectSlug, platformName, companyName, publicBaseUrl);

    // Return the projectSlug so the page can redirect to provision status
    return NextResponse.json({
      ok: true,
      projectSlug,
      message: 'Provisioning started'
    });

  } catch (err: any) {
    console.error('Setup start error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to start provisioning' },
      { status: 500 }
    );
  }
}