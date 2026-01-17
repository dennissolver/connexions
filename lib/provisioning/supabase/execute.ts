// lib/provisioning/supabase/execute.ts
// Creates Supabase project - no dependencies, starts immediately

import { ProvisionContext, StepResult } from '../types';

const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const SUPABASE_ORG_ID = process.env.SUPABASE_ORG_ID;

export async function supabaseExecute(ctx: ProvisionContext): Promise<StepResult> {
  // Already have a project? Skip (idempotent)
  if (ctx.metadata.supabase_project_ref) {
    console.log(`[supabase.execute] Already exists: ${ctx.metadata.supabase_project_ref}`);
    return { status: 'advance' };
  }

  // Check for required env vars
  if (!SUPABASE_ACCESS_TOKEN || !SUPABASE_ORG_ID) {
    return {
      status: 'fail',
      error: 'SUPABASE_ACCESS_TOKEN or SUPABASE_ORG_ID not configured',
    };
  }

  try {
    const projectName = `cx-${ctx.projectSlug}`;
    const dbPass = generatePassword(32);

    const res = await fetch('https://api.supabase.com/v1/projects', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: projectName,
        organization_id: SUPABASE_ORG_ID,
        region: 'us-east-1',
        db_pass: dbPass,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return {
        status: 'fail',
        error: `Supabase API error (${res.status}): ${text}`,
      };
    }

    const project = await res.json();
    console.log(`[supabase.execute] Created: ${project.id}`);

    return {
      status: 'advance',
      metadata: {
        supabase_project_ref: project.id,
        supabase_url: `https://${project.id}.supabase.co`,
      },
    };
  } catch (err) {
    return {
      status: 'fail',
      error: `Supabase creation failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

function generatePassword(length: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, x => chars[x % chars.length]).join('');
}
