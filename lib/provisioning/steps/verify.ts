// lib/provisioning/steps/verify.ts

import { ProvisionContext, ProvisionStepResult } from '../types';

const SUPABASE_API = 'https://api.supabase.com/v1';
const SUPABASE_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!SUPABASE_TOKEN) {
  throw new Error('Missing SUPABASE_ACCESS_TOKEN');
}

export async function verifySupabaseProject(
  ctx: ProvisionContext
): Promise<ProvisionStepResult> {
  const projectRef = ctx.metadata.supabaseProjectRef;

  if (!projectRef) {
    throw new Error('supabaseProjectRef missing from metadata');
  }

  const res = await fetch(`${SUPABASE_API}/projects/${projectRef}`, {
    headers: {
      Authorization: `Bearer ${SUPABASE_TOKEN}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Supabase project verification failed (${res.status})`);
  }

  return {
    nextState: 'COMPLETE',
    metadata: ctx.metadata,
  };
}
