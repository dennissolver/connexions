// lib/provisioning/orchestrator.ts

import { executeProvisionStep } from './executeStep';
import {
  getProvisionRun,
  advanceState,
  failRun,
} from './engine';
import { sendProvisioningAlert } from './alerts';
import { captureProvisioningError } from '@/lib/provisioning/sentry';
import {
  shouldRetryProvisioning,
  recordRetry,
} from '@/lib/provisioning/retry';

/**
 * Orchestration contract:
 *
 * - This function MAY execute provisioning steps
 * - ONLY when run.status === 'provisioning_requested'
 * - Reading state must NEVER cause execution
 * - Observers may call this safely
 */
export async function runProvisioningStep(
  projectSlug: string,
  publicBaseUrl: string
) {
  const run = await getProvisionRun(projectSlug);

  // 🔒 HARD GUARD — NO INTENT, NO EXECUTION
  if (!run || run.status !== 'provisioning_requested') {
    return run;
  }

  try {
    const result = await executeProvisionStep(run.state, {
      projectSlug,
      publicBaseUrl,
      supabaseToken: process.env.SUPABASE_ACCESS_TOKEN!,
      supabaseOrgId: process.env.SUPABASE_ORG_ID!,
      metadata: run.metadata ?? {},
    });

    // No transition = no mutation
    if (!result?.nextState) {
      return run;
    }

    await advanceState(
      projectSlug,
      run.state,
      result.nextState,
      result.metadata ?? run.metadata
    );

    return await getProvisionRun(projectSlug);

  } catch (err: any) {
    captureProvisioningError({
      projectSlug,
      state: run.state,
      error: err,
      metadata: run.metadata,
    });

    const retryAllowed = await shouldRetryProvisioning(projectSlug);

    if (retryAllowed) {
      await recordRetry(projectSlug);
      return run;
    }

    await failRun(projectSlug, err?.message ?? 'Provisioning failed');

    await sendProvisioningAlert({
      projectSlug,
      state: run.state,
      error: err?.message ?? 'Provisioning failed',
      metadata: run.metadata,
    });

    throw err;
  }
}
