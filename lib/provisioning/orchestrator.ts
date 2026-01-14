// lib/provisioning/orchestrator.ts

import { executeProvisionStep } from './executeStep';
import {
  getProvisionRun,
  advanceState,
  failRun,
} from './engine';
import { sendProvisioningAlert } from './alerts';
import { captureProvisioningError } from './sentry';
import {
  shouldRetryProvisioning,
  recordRetry,
} from './retry';
import { ProvisionState } from './states';

export async function runProvisioningStep(
  projectSlug: string,
  publicBaseUrl: string
) {
  const run = await getProvisionRun(projectSlug);

  try {
    const result = await executeProvisionStep(run.state as ProvisionState, {
      projectSlug,
      publicBaseUrl,
      supabaseToken: process.env.SUPABASE_ACCESS_TOKEN!,
      supabaseOrgId: process.env.SUPABASE_ORG_ID!,
      metadata: run.metadata ?? {},
    });

    if (!result.nextState) return run;

    await advanceState(
      projectSlug,
      run.state as ProvisionState,
      result.nextState,
      result.metadata
    );

    return getProvisionRun(projectSlug);
  } catch (err: any) {
    captureProvisioningError({
      projectSlug,
      state: run.state,
      error: err,
      metadata: run.metadata,
    });

    const retry = await shouldRetryProvisioning(projectSlug);

    if (retry) {
      await recordRetry(projectSlug);
      return run;
    }

    await failRun(projectSlug, err.message);

    await sendProvisioningAlert({
      projectSlug,
      state: run.state,
      error: err.message,
      metadata: run.metadata,
    });

    throw err;
  }
}

/**
 * ✅ COMPATIBILITY EXPORT
 * Keeps existing API routes working
 */
export async function runOrchestrator(
  projectSlug: string,
  publicBaseUrl: string
) {
  return runProvisioningStep(projectSlug, publicBaseUrl);
}
