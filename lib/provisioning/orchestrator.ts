// lib/provisioning/orchestrator.ts
// Parallel orchestrator - processes all services concurrently

import { advanceService, ServiceAdvanceResult } from './engine';
import {
  getProvisionRunBySlug,
  getActiveProvisionRuns,
  createProvisionRun,
  setOverallStatus,
  getServiceStates,
} from './store';
import {
  ServiceName,
  ServiceStates,
  allServicesComplete,
  allServicesReady,
  anyServiceFailed,
  isServiceActionable,
} from './types';

const ALL_SERVICES: ServiceName[] = [
  'supabase',
  'github', 
  'vercel',
  'sandra',
  'kira',
  'webhooks',
];

const MAX_ITERATIONS = 100;
const POLL_INTERVAL_MS = 2000;

// =============================================================================
// SINGLE PROJECT ORCHESTRATION
// =============================================================================

export interface OrchestrationResult {
  projectSlug: string;
  services: ServiceStates;
  iterations: number;
  complete: boolean;
  success: boolean;
  results: ServiceAdvanceResult[];
}

/**
 * Run one iteration of parallel provisioning.
 * Advances all actionable services concurrently.
 */
async function runIteration(projectSlug: string): Promise<ServiceAdvanceResult[]> {
  const run = await getProvisionRunBySlug(projectSlug);
  if (!run) {
    throw new Error(`Provision run not found: ${projectSlug}`);
  }

  const services = getServiceStates(run);
  
  // Find all services that can be advanced
  const actionableServices = ALL_SERVICES.filter(
    service => isServiceActionable(services[service])
  );

  if (actionableServices.length === 0) {
    return [];
  }

  console.log(`[orchestrator] ${projectSlug}: advancing ${actionableServices.join(', ')}`);

  // Run all actionable services in parallel
  const results = await Promise.all(
    actionableServices.map(service => advanceService(projectSlug, service))
  );

  return results;
}

/**
 * Run provisioning until complete or max iterations.
 * All services execute in parallel, waiting only on their specific dependencies.
 */
export async function runProvisioning(projectSlug: string): Promise<OrchestrationResult> {
  const run = await getProvisionRunBySlug(projectSlug);
  if (!run) {
    throw new Error(`Provision run not found: ${projectSlug}`);
  }

  let iterations = 0;
  const allResults: ServiceAdvanceResult[] = [];

  while (iterations < MAX_ITERATIONS) {
    iterations++;

    // Run one parallel iteration
    const results = await runIteration(projectSlug);
    allResults.push(...results);

    // Check if we're done
    const currentRun = await getProvisionRunBySlug(projectSlug);
    const services = getServiceStates(currentRun!);

    if (allServicesComplete(services)) {
      // Determine final status
      const success = allServicesReady(services);
      await setOverallStatus(projectSlug, success ? 'complete' : 'failed');

      console.log(`[orchestrator] ${projectSlug}: ${success ? 'COMPLETE ✓' : 'FAILED ✗'}`);

      return {
        projectSlug,
        services,
        iterations,
        complete: true,
        success,
        results: allResults,
      };
    }

    // If no services advanced, wait before polling again
    const anyAdvanced = results.some(r => r.previousState !== r.currentState);
    if (!anyAdvanced) {
      await sleep(POLL_INTERVAL_MS);
    }
  }

  // Hit max iterations - still running
  const finalRun = await getProvisionRunBySlug(projectSlug);
  const finalServices = getServiceStates(finalRun!);

  console.warn(`[orchestrator] ${projectSlug}: max iterations reached`);

  return {
    projectSlug,
    services: finalServices,
    iterations,
    complete: false,
    success: false,
    results: allResults,
  };
}

// =============================================================================
// BATCH ORCHESTRATION (for cron jobs)
// =============================================================================

export interface BatchResult {
  processed: number;
  completed: number;
  failed: number;
  running: number;
  results: OrchestrationResult[];
}

/**
 * Process all active provision runs.
 * Call this from a cron job to resume waiting provisions.
 */
export async function processActiveRuns(): Promise<BatchResult> {
  const activeRuns = await getActiveProvisionRuns();
  const results: OrchestrationResult[] = [];

  let completed = 0;
  let failed = 0;
  let running = 0;

  for (const run of activeRuns) {
    try {
      // Run just one iteration for batch processing
      const iterationResults = await runIteration(run.project_slug);
      
      const currentRun = await getProvisionRunBySlug(run.project_slug);
      const services = getServiceStates(currentRun!);

      if (allServicesComplete(services)) {
        const success = allServicesReady(services);
        await setOverallStatus(run.project_slug, success ? 'complete' : 'failed');
        
        if (success) completed++;
        else failed++;

        results.push({
          projectSlug: run.project_slug,
          services,
          iterations: 1,
          complete: true,
          success,
          results: iterationResults,
        });
      } else {
        running++;
        results.push({
          projectSlug: run.project_slug,
          services,
          iterations: 1,
          complete: false,
          success: false,
          results: iterationResults,
        });
      }
    } catch (err) {
      console.error(`[orchestrator] Error processing ${run.project_slug}:`, err);
      failed++;
    }
  }

  return {
    processed: activeRuns.length,
    completed,
    failed,
    running,
    results,
  };
}

// =============================================================================
// INITIALIZATION
// =============================================================================

export interface StartProvisioningParams {
  projectSlug: string;
  clientId?: string;
  companyName: string;
  platformName: string;
  metadata?: Record<string, unknown>;
}

/**
 * Start a new provisioning run with parallel execution.
 */
export async function startProvisioning(params: StartProvisioningParams): Promise<OrchestrationResult> {
  // Check if already exists
  const existing = await getProvisionRunBySlug(params.projectSlug);
  if (existing) {
    // Resume existing run
    return runProvisioning(params.projectSlug);
  }

  // Create new run - all services start PENDING
  await createProvisionRun({
    projectSlug: params.projectSlug,
    clientId: params.clientId,
    companyName: params.companyName,
    platformName: params.platformName,
    metadata: params.metadata,
  });

  // Begin parallel orchestration
  return runProvisioning(params.projectSlug);
}

// =============================================================================
// HELPERS
// =============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
