// lib/provisioning/engine.ts
// Processes a single service - called by orchestrator for each service in parallel

import {
  ServiceName,
  ServiceState,
  StepResult,
  ProvisionContext,
} from './types';
import {
  getProvisionRunBySlug,
  setServiceState,
  setServiceError,
  updateMetadata,
  runToContext,
  getServiceStates,
} from './store';
import {
  EXECUTE_HANDLERS,
  VERIFY_HANDLERS,
  areDependenciesReady,
  getBlockingDependencies,
} from './registry';

export interface ServiceAdvanceResult {
  service: ServiceName;
  previousState: ServiceState;
  currentState: ServiceState;
  blocking?: ServiceName[];
  error?: string;
}

/**
 * Advance a single service by one step.
 * 
 * State transitions:
 *   PENDING → CREATING (if dependencies ready) or stays PENDING
 *   CREATING → VERIFYING (after execute succeeds)
 *   VERIFYING → READY (if verified) or WAITING (if not yet)
 *   WAITING → VERIFYING (retry verification)
 *   READY → (no action)
 *   FAILED → (no action)
 */
export async function advanceService(
  projectSlug: string,
  service: ServiceName
): Promise<ServiceAdvanceResult> {
  // Load current state
  const run = await getProvisionRunBySlug(projectSlug);
  if (!run) {
    throw new Error(`Provision run not found: ${projectSlug}`);
  }

  const ctx = runToContext(run);
  const services = getServiceStates(run);
  const previousState = services[service];

  // Already terminal? Nothing to do
  if (previousState === 'READY' || previousState === 'FAILED') {
    return {
      service,
      previousState,
      currentState: previousState,
    };
  }

  // Check dependencies before doing anything
  if (!areDependenciesReady(service, services)) {
    const blocking = getBlockingDependencies(service, services);
    console.log(`[engine] ${service}: waiting on dependencies: ${blocking.join(', ')}`);
    
    // Stay in current state (PENDING or WAITING)
    return {
      service,
      previousState,
      currentState: previousState,
      blocking,
    };
  }

  let newState: ServiceState = previousState;
  let result: StepResult;

  try {
    switch (previousState) {
      case 'PENDING':
        // Dependencies ready - start creating
        await setServiceState(projectSlug, service, 'CREATING');
        newState = 'CREATING';
        
        // Immediately execute
        result = await EXECUTE_HANDLERS[service](ctx);
        
        if (result.status === 'fail') {
          await setServiceError(projectSlug, service, result.error || 'Execute failed');
          newState = 'FAILED';
        } else {
          // Save any metadata from execute
          if (result.metadata) {
            await updateMetadata(projectSlug, result.metadata);
          }
          await setServiceState(projectSlug, service, 'VERIFYING');
          newState = 'VERIFYING';
        }
        break;

      case 'CREATING':
        // Execute in progress - run execute again (idempotent)
        result = await EXECUTE_HANDLERS[service](ctx);
        
        if (result.status === 'fail') {
          await setServiceError(projectSlug, service, result.error || 'Execute failed');
          newState = 'FAILED';
        } else {
          if (result.metadata) {
            await updateMetadata(projectSlug, result.metadata);
          }
          await setServiceState(projectSlug, service, 'VERIFYING');
          newState = 'VERIFYING';
        }
        break;

      case 'VERIFYING':
      case 'WAITING':
        // Run verification
        // Reload context to get latest metadata
        const freshRun = await getProvisionRunBySlug(projectSlug);
        const freshCtx = runToContext(freshRun!);
        
        result = await VERIFY_HANDLERS[service](freshCtx);
        
        if (result.status === 'advance') {
          if (result.metadata) {
            await updateMetadata(projectSlug, result.metadata);
          }
          await setServiceState(projectSlug, service, 'READY');
          newState = 'READY';
          console.log(`[engine] ${service}: READY ✓`);
        } else if (result.status === 'wait') {
          await setServiceState(projectSlug, service, 'WAITING');
          newState = 'WAITING';
        } else if (result.status === 'fail') {
          await setServiceError(projectSlug, service, result.error || 'Verify failed');
          newState = 'FAILED';
        }
        break;
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[engine] ${service} error:`, errorMsg);
    await setServiceError(projectSlug, service, errorMsg);
    newState = 'FAILED';
  }

  return {
    service,
    previousState,
    currentState: newState,
  };
}
