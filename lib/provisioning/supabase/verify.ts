// lib/provisioning/supabase/verify.ts
// Verifies Supabase project is ready and configured

import { ProvisionContext, StepResult } from '../types';
import { isProjectReady, getProjectApiKeys } from './client';

export async function supabaseVerify(ctx: ProvisionContext): Promise<StepResult> {
  const projectRef = ctx.metadata.supabase_project_ref;

  if (!projectRef) {
    return {
      status: 'fail',
      error: 'No Supabase project ref in metadata',
    };
  }

  try {
    // Check if project is active
    const ready = await isProjectReady(projectRef as string);

    if (!ready) {
      console.log(`[supabase.verify] Project ${projectRef} not ready yet`);
      return {
        status: 'wait',
      };
    }

    // Get API keys
    const keys = await getProjectApiKeys(projectRef as string);

    if (!keys) {
      console.log(`[supabase.verify] API keys not available yet`);
      return {
        status: 'wait',
      };
    }

    console.log(`[supabase.verify] Project ${projectRef} verified`);

    return {
      status: 'advance',
      metadata: {
        supabase_anon_key: keys.anon,
        supabase_service_role_key: keys.service_role,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[supabase.verify] Error:`, msg);

    // Treat as transient - go to waiting
    return {
      status: 'wait',
    };
  }
}
