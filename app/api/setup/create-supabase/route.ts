// app/api/setup/create-supabase/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { orgId, projectName, region = 'us-east-1', supabaseToken } = await request.json();

    if (!orgId || !projectName || !supabaseToken) {
      return NextResponse.json(
        { error: 'Missing required fields: orgId, projectName, or supabaseToken' },
        { status: 400 }
      );
    }

    // Step 1: Create new Supabase project
    const createRes = await fetch('https://api.supabase.com/v1/projects', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${supabaseToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: projectName,
        organization_id: orgId,
        database_password: generateSecurePassword(),
        region,
      }),
    });

    if (!createRes.ok) {
      const errorText = await createRes.text();
      return NextResponse.json(
        { error: `Supabase project creation failed: ${errorText}` },
        { status: createRes.status }
      );
    }

    const project = await createRes.json();
    const projectRef = project.ref;

    // Step 2: Fetch the API keys
    const keysRes = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/api-keys`, {
      headers: {
        Authorization: `Bearer ${supabaseToken}`,
      },
    });

    if (!keysRes.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch Supabase API keys' },
        { status: keysRes.status }
      );
    }

    const keys = await keysRes.json();
    const anonKey = keys.find((k: any) => k.name === 'anon')?.api_key;
    const serviceRoleKey = keys.find((k: any) => k.name === 'service_role')?.api_key;

    return NextResponse.json({
      projectRef,
      anonKey,
      serviceRoleKey,
      dashboardUrl: `https://app.supabase.com/project/${projectRef}`,
    });
  } catch (err: any) {
    console.error('Supabase provisioning error:', err);
    return NextResponse.json({ error: err.message || 'Unexpected error' }, { status: 500 });
  }
}

function generateSecurePassword(length = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=';
  let password = '';
  while (password.length < length) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

