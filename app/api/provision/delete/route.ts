// app/api/provision/delete/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getProvisionRun, deleteProvisionRun } from '@/lib/provisioning/engine';
import { deleteProvisionedPlatform } from '@/lib/provisioning/steps/cleanup';
import { ProvisionContext } from '@/lib/provisioning/types';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { projectSlug, deleteResources = true } = await req.json();

    if (!projectSlug) {
      return NextResponse.json({ error: 'Missing projectSlug' }, { status: 400 });
    }

    const run = await getProvisionRun(projectSlug);
    if (!run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }

    let deleted: string[] = [];
    let errors: string[] = [];

    // Delete external resources if requested
    if (deleteResources) {
      const publicBaseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://connexions-silk.vercel.app';

      const ctx: ProvisionContext = {
        projectSlug: run.project_slug,
        platformName: run.platform_name || '',
        companyName: run.company_name || '',
        metadata: run.metadata || {},
        publicBaseUrl,
        parentWebhookUrl: `${publicBaseUrl}/api/child/transcript`,
        supabaseToken: process.env.SUPABASE_ACCESS_TOKEN!,
        supabaseOrgId: process.env.SUPABASE_ORG_ID!,
        githubToken: process.env.GITHUB_TOKEN!,
        githubOwner: process.env.GITHUB_OWNER || 'dennissolver',
        vercelToken: process.env.VERCEL_TOKEN!,
        vercelTeamId: process.env.VERCEL_TEAM_ID,
        elevenLabsApiKey: process.env.ELEVENLABS_API_KEY!,
        colors: { primary: '#8B5CF6', accent: '#10B981', background: '#0F172A' },
      };

      const result = await deleteProvisionedPlatform(ctx);
      deleted = result.deleted;
      errors = result.errors;
    }

    // Delete the provision_runs record
    await deleteProvisionRun(projectSlug);

    return NextResponse.json({
      success: true,
      projectSlug,
      deleted,
      errors: errors.length ? errors : undefined,
      message: `Platform ${projectSlug} deleted successfully`,
    });

  } catch (err: any) {
    console.error('[provision/delete] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}