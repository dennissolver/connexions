import { NextRequest, NextResponse } from 'next/server';
import { generatePassword } from '@/lib/security/passwords';
import { fetchSupabaseApiKeys } from '@/lib/provisioning/helpers/fetchSupabaseApiKeys';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const platformName = body.platformName || body.projectName;

    if (!platformName) {
      return NextResponse.json(
        { error: 'platformName or projectName is required' },
        { status: 400 }
      );
    }

    const token = process.env.SUPABASE_ACCESS_TOKEN;
    const orgId = process.env.SUPABASE_ORG_ID;

    if (!token || !orgId) {
      return NextResponse.json(
        { error: 'SUPABASE_ACCESS_TOKEN and SUPABASE_ORG_ID must be set' },
        { status: 500 }
      );
    }

    // ------------------------------------------------------------------
    // Normalise project name
    // ------------------------------------------------------------------

    const safeName = platformName
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/--+/g, '-')
      .slice(0, 40);

    const vercelUrl = `https://${safeName}.vercel.app`;

    // ------------------------------------------------------------------
    // Check for existing Supabase project
    // ------------------------------------------------------------------

    const listRes = await fetch('https://api.supabase.com/v1/projects', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!listRes.ok) {
      return NextResponse.json(
        { error: 'Failed to list Supabase projects' },
        { status: 500 }
      );
    }

    const projects = await listRes.json();
    let project = projects.find((p: any) => p.name === safeName);

    // ------------------------------------------------------------------
    // Create project if it does not exist
    // ------------------------------------------------------------------

    if (!project) {
      const createRes = await fetch('https://api.supabase.com/v1/projects', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: safeName,
          organization_id: orgId,
          region: 'ap-southeast-2',
          plan: 'free',
          db_pass: generatePassword(),
        }),
      });

      if (!createRes.ok) {
        const errorText = await createRes.text();
        return NextResponse.json(
          { error: errorText },
          { status: createRes.status }
        );
      }

      project = await createRes.json();
    }

    // ------------------------------------------------------------------
    // Canonical Supabase project reference
    // ------------------------------------------------------------------

    const projectRef = project.ref;
    const supabaseUrl = `https://${projectRef}.supabase.co`;

    // ------------------------------------------------------------------
    // Fetch API keys ONCE (anon + service_role)
    // ------------------------------------------------------------------

    const keys = await fetchSupabaseApiKeys(projectRef, token);

    if (!keys.anon || !keys.service_role) {
      return NextResponse.json(
        { error: 'Failed to retrieve Supabase API keys' },
        { status: 500 }
      );
    }

    const anonKey = keys.anon;
    const serviceKey = keys.service_role;

    // ------------------------------------------------------------------
    // OPTIONAL: readiness checks / migrations / auth config
    // (leave hooks here for orchestrator steps)
    // ------------------------------------------------------------------

    // await runMigration(token, projectRef);
    // await createStorageBuckets(supabaseUrl, serviceKey);
    // await configureAuthUrls(token, projectRef, vercelUrl);

    // ------------------------------------------------------------------
    // Success response
    // ------------------------------------------------------------------

    return NextResponse.json({
      success: true,
      projectRef,
      supabaseUrl,
      anonKey,
      serviceKey,
      vercelUrl,
    });

  } catch (err: any) {
    console.error('Supabase provisioning error:', err);
    return NextResponse.json(
      { error: err.message || 'Unexpected provisioning error' },
      { status: 500 }
    );
  }
}
