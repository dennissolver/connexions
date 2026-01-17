// app/api/setup/start/route.ts
import { NextResponse } from 'next/server';
import { startProvisioning } from '@/lib/provisioning/orchestrator';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { platformName, companyName, contactEmail } = body;

    // Validate required fields
    if (!platformName || !companyName) {
      return NextResponse.json(
        { error: 'Missing required fields: platformName, companyName' },
        { status: 400 }
      );
    }

    // Generate project slug from platform name
    const projectSlug = platformName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50);

    // Start provisioning with object parameter
    const result = await startProvisioning({
      projectSlug,
      platformName,
      companyName,
      metadata: { contactEmail },
    });

    return NextResponse.json({
      ok: true,
      projectSlug,
      complete: result.complete,
      success: result.success,
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
