// lib/provisioning/engine.ts
// Executes exactly ONE state advancement
// No loops, no business logic, just dispatch

import {
  ProvisionState,
  StepResult,
  isTerminalState,
} from './types';
import {
  getProvisionRunBySlug,
  setProvisionState,
  recordProvisionError,
  runToContext,
} from './store';
import {
  getHandler,
  getNextState,
  getWaitingState,
} from './registry';

export interface AdvanceResult {
  previousState: ProvisionState;
  currentState: ProvisionState;
  done: boolean;
  error?: string;
}

/**
 * Advance a provision run by exactly one step.
 *
 * Returns the result of that single advancement.
 * Does NOT loop - that's the orchestrator's job.
 */
export async function advance(projectSlug: string): Promise<AdvanceResult> {
  // 1. Load current state
  const run = await getProvisionRunBySlug(projectSlug);
  if (!run) {
    throw new Error(`Provision run not found: ${projectSlug}`);
  }

  const previousState = run.state;

  // 2. Check if already terminal
  if (isTerminalState(previousState)) {
    return {
      previousState,
      currentState: previousState,
      done: true,
    };
  }

  // 3. Get handler for current state
  const handler = getHandler(previousState);
  if (!handler) {
    // No handler means nothing to do (shouldn't happen for non-terminal states)
    console.warn(`[engine] No handler for state: ${previousState}`);
    return {
      previousState,
      currentState: previousState,
      done: true,
      error: `No handler for state: ${previousState}`,
    };
  }

  // 4. Execute the handler
  const ctx = runToContext(run);
  let result: StepResult;

  try {
    result = await handler(ctx);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await recordProvisionError(projectSlug, errorMsg);
    await setProvisionState(projectSlug, 'FAILED');
    return {
      previousState,
      currentState: 'FAILED',
      done: true,
      error: errorMsg,
    };
  }

  // 5. Process the result
  let nextState: ProvisionState;

  switch (result.status) {
    case 'advance':
      // Use explicit next state if provided, otherwise get from registry
      nextState = result.next || getNextState(previousState) || 'FAILED';
      break;

    case 'wait':
      // Move to waiting state
      nextState = getWaitingState(previousState) || previousState;
      break;

    case 'fail':
      nextState = 'FAILED';
      if (result.error) {
        await recordProvisionError(projectSlug, result.error);
      }
      break;

    default:
      nextState = 'FAILED';
  }

  // 6. Persist new state and metadata
  await setProvisionState(projectSlug, nextState, result.metadata);

  return {
    previousState,
    currentState: nextState,
    done: isTerminalState(nextState),
    error: result.error,
  };
}
