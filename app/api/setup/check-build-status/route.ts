// app/api/setup/check-build-status/route.ts
// ============================================================================
// CHECK BUILD STATUS - Polls Vercel API to check deployment build status
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deploymentId = searchParams.get('deploymentId');
    const projectName = searchParams.get('projectName');

    if (!deploymentId && !projectName) {
      return NextResponse.json({ error: 'deploymentId or projectName required' }, { status: 400 });
    }

    const vercelToken = process.env.VERCEL_TOKEN;
    const vercelTeamId = process.env.VERCEL_TEAM_ID;

    if (!vercelToken) {
      return NextResponse.json({ error: 'VERCEL_TOKEN not configured' }, { status: 500 });
    }

    const teamQuery = vercelTeamId ? `?teamId=${vercelTeamId}` : '';

    let deployment: any = null;

    // Try to get deployment by ID first
    if (deploymentId) {
      const res = await fetch(
        `https://api.vercel.com/v13/deployments/${deploymentId}${teamQuery}`,
        {
          headers: { Authorization: `Bearer ${vercelToken}` },
        }
      );

      if (res.ok) {
        deployment = await res.json();
      }
    }

    // If no deployment found by ID, try to get latest for project
    if (!deployment && projectName) {
      const safeName = projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
      const listRes = await fetch(
        `https://api.vercel.com/v6/deployments?projectId=${safeName}&limit=1${vercelTeamId ? `&teamId=${vercelTeamId}` : ''}`,
        {
          headers: { Authorization: `Bearer ${vercelToken}` },
        }
      );

      if (listRes.ok) {
        const data = await listRes.json();
        if (data.deployments && data.deployments.length > 0) {
          deployment = data.deployments[0];
        }
      }
    }

    if (!deployment) {
      return NextResponse.json({
        status: 'NOT_FOUND',
        error: 'Deployment not found',
      });
    }

    // Map Vercel status to our status
    // Vercel states: QUEUED, BUILDING, READY, ERROR, CANCELED
    const status = deployment.readyState || deployment.state || 'UNKNOWN';
    const url = deployment.url ? `https://${deployment.url}` : null;

    // Get error message if failed
    let error: string | null = null;
    if (status === 'ERROR') {
      error = deployment.errorMessage || 'Build failed - check Vercel dashboard for details';
    }

    console.log(`[CheckBuild] Deployment ${deploymentId || projectName}: ${status}`);

    return NextResponse.json({
      status,
      url,
      error,
      deploymentId: deployment.uid || deployment.id,
      createdAt: deployment.createdAt,
      buildingAt: deployment.buildingAt,
      ready: deployment.ready,
    });

  } catch (error: any) {
    console.error('[CheckBuild] Error:', error);
    return NextResponse.json({
      status: 'ERROR',
      error: error.message || 'Failed to check build status',
    }, { status: 500 });
  }
}
