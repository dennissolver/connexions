// lib/provisioning/orchestrator.ts
// Loop controller - repeatedly calls engine until done or waiting
// Safe to invoke from cron, webhook, or manual trigger

import { advance, AdvanceResult } from './engine';
import {
  getProvisionRunBySlug,
  getActiveProvisionRuns,
  createProvisionRun,
} from './store';
import { isWaitingState, isTerminalState, ProvisionState } from './types';
import { sleep } from './sleep';

// =============================================================================
// CONFIGURATION
// =============================================================================

const MAX_ITERATIONS = 50; // Safety limit per run
const STEP_DELAY_MS = 500; // Delay between steps to avoid hammering APIs

// =============================================================================
// SINGLE PROJECT ORCHESTRATION
// =============================================================================

export interface OrchestrationResult {
  projectSlug: string;
  startState: ProvisionState;
  endState: ProvisionState;
  iterations: number;
  completed: boolean;
  waiting: boolean;
  error?: string;
}

/**
 * Run provisioning for a single project until completion or waiting state.
 *
 * Idempotent - safe to call multiple times.
 */
export async function runProvisioning(projectSlug: string): Promise<OrchestrationResult> {
  const run = await getProvisionRunBySlug(projectSlug);
  if (!run) {
    throw new Error(`Provision run not found: ${projectSlug}`);
  }

  const startState = run.state;
  let currentState = startState;
  let iterations = 0;
  let lastError: string | undefined;

  // Already terminal? Nothing to do
  if (isTerminalState(startState)) {
    return {
      projectSlug,
      startState,
      endState: startState,
      iterations: 0,
      completed: startState === 'COMPLETE',
      waiting: false,
    };
  }

  // Loop until terminal, waiting, or max iterations
  while (iterations < MAX_ITERATIONS) {
    iterations++;

    const result = await advance(projectSlug);
    currentState = result.currentState;
    lastError = result.error;

    console.log(`[orchestrator] ${projectSlug}: ${result.previousState} → ${currentState}`);

    // Terminal state reached
    if (result.done) {
      break;
    }

    // Waiting state - stop and let polling resume later
    if (isWaitingState(currentState)) {
      console.log(`[orchestrator] ${projectSlug}: entering wait state`);
      break;
    }

    // Brief delay between steps
    await sleep(STEP_DELAY_MS);
  }

  if (iterations >= MAX_ITERATIONS) {
    console.warn(`[orchestrator] ${projectSlug}: hit max iterations`);
  }

  return {
    projectSlug,
    startState,
    endState: currentState,
    iterations,
    completed: currentState === 'COMPLETE',
    waiting: isWaitingState(currentState),
    error: lastError,
  };
}

// =============================================================================
// BATCH ORCHESTRATION (for cron jobs)
// =============================================================================

export interface BatchResult {
  processed: number;
  completed: number;
  waiting: number;
  failed: number;
  results: OrchestrationResult[];
}

/**
 * Process all active (non-terminal) provision runs.
 *
 * Call this from a cron job to resume waiting provisions.
 */
export async function processActiveRuns(): Promise<BatchResult> {
  const activeRuns = await getActiveProvisionRuns();
  const results: OrchestrationResult[] = [];

  let completed = 0;
  let waiting = 0;
  let failed = 0;

  for (const run of activeRuns) {
    try {
      const result = await runProvisioning(run.project_slug);
      results.push(result);

      if (result.completed) completed++;
      else if (result.waiting) waiting++;
      else if (result.endState === 'FAILED') failed++;
    } catch (err) {
      console.error(`[orchestrator] Error processing ${run.project_slug}:`, err);
      failed++;
    }
  }

  return {
    processed: activeRuns.length,
    completed,
    waiting,
    failed,
    results,
  };
}

// =============================================================================
// INITIALIZATION
// =============================================================================

export interface StartProvisioningParams {
  projectSlug: string;
  clientId: string;
  companyName: string;
  platformName: string;
}

/**
 * Start a new provisioning run.
 *
 * Creates the run record and begins orchestration.
 */
export async function startProvisioning(params: StartProvisioningParams): Promise<OrchestrationResult> {
  // Check if already exists
  const existing = await getProvisionRunBySlug(params.projectSlug);
  if (existing) {
    // Resume existing run
    return runProvisioning(params.projectSlug);
  }

  // Create new run
  await createProvisionRun({
    projectSlug: params.projectSlug,
    clientId: params.clientId,
    companyName: params.companyName,
    platformName: params.platformName,
  });

  // Begin orchestration
  return runProvisioning(params.projectSlug);
}
