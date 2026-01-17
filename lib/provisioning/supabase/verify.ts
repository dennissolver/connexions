// lib/provisioning/supabase/verify.ts
// Verifies Supabase project is active and API keys available

import { ProvisionContext, StepResult } from '../types';

const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

export async function supabaseVerify(ctx: ProvisionContext): Promise<StepResult> {
  const projectRef = ctx.metadata.supabase_project_ref as string;

  if (!projectRef) {
    return {
      status: 'fail',
      error: 'No supabase_project_ref in metadata',
    };
  }

  try {
    // Check project status
    const projectRes = await fetch(`https://api.supabase.com/v1/projects/${projectRef}`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
      },
    });

    if (!projectRes.ok) {
      console.log(`[supabase.verify] Project not ready: ${projectRes.status}`);
      return { status: 'wait' };
    }

    const project = await projectRes.json();

    if (project.status !== 'ACTIVE_HEALTHY') {
      console.log(`[supabase.verify] Project status: ${project.status}`);
      return { status: 'wait' };
    }

    // Get API keys
    const keysRes = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/api-keys`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
      },
    });

    if (!keysRes.ok) {
      console.log(`[supabase.verify] API keys not available`);
      return { status: 'wait' };
    }

    const keys = await keysRes.json();
    const anonKey = keys.find((k: any) => k.name === 'anon')?.api_key;
    const serviceRoleKey = keys.find((k: any) => k.name === 'service_role')?.api_key;

    if (!anonKey || !serviceRoleKey) {
      console.log(`[supabase.verify] Keys not yet generated`);
      return { status: 'wait' };
    }

    console.log(`[supabase.verify] Verified: ${projectRef}`);

    return {
      status: 'advance',
      metadata: {
        supabase_anon_key: anonKey,
        supabase_service_role_key: serviceRoleKey,
      },
    };
  } catch (err) {
    console.log(`[supabase.verify] Error, will retry: ${err}`);
    return { status: 'wait' };
  }
}
