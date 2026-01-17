// lib/provisioning/index.ts
// Public API for provisioning system

// =============================================================================
// ORCHESTRATION (Main entry points)
// =============================================================================

export {
  startProvisioning,
  runProvisioning,
  processActiveRuns,
  type OrchestrationResult,
  type BatchResult,
  type StartProvisioningParams,
} from './orchestrator';

// =============================================================================
// ENGINE (For advanced use cases)
// =============================================================================

export {
  advance,
  type AdvanceResult,
} from './engine';

// =============================================================================
// STORE (For querying provision state)
// =============================================================================

export {
  getProvisionRunBySlug,
  getProvisionRunById,
  getActiveProvisionRuns,
} from './store';

// =============================================================================
// REGISTRY (For UI metadata)
// =============================================================================

export {
  getStepUiMeta,
  type StepUiMeta,
} from './registry';

// =============================================================================
// TYPES
// =============================================================================

export type {
  ProvisionState,
  ProvisionContext,
  ProvisionMetadata,
  ProvisionRun,
  StepResult,
  StepStatus,
} from './types';

export {
  isTerminalState,
  isWaitingState,
  isExecutableState,
  isVerifyingState,
  isReadyState,
} from './types';
