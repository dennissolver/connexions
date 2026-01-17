// app/api/setup/start/route.ts
import { NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { startProvisioning } from '@/lib/provisioning/orchestrator';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { platformName, companyName, contactEmail } = body;

    if (!platformName || !companyName) {
      return NextResponse.json(
        { error: 'Missing required fields: platformName, companyName' },
        { status: 400 }
      );
    }

    const projectSlug = platformName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50);

    // Run provisioning in background after response is sent
    waitUntil(
      startProvisioning({
        projectSlug,
        platformName,
        companyName,
        metadata: { contactEmail },
      }).catch((err) => {
        console.error('Background provisioning error:', err);
      })
    );

    // Return immediately
    return NextResponse.json({
      ok: true,
      projectSlug,
      message: 'Provisioning started',
    });
  } catch (err: any) {
    console.error('Setup start error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to start provisioning' },
      { status: 500 }
    );
  }
}