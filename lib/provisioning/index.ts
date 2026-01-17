// lib/provisioning/index.ts
// Public API for parallel provisioning system

// =============================================================================
// ORCHESTRATION
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
// STORE
// =============================================================================

export {
  createProvisionRun,
  getProvisionRunBySlug,
  getActiveProvisionRuns,
  setServiceState,
  getServiceStates,
} from './store';

// =============================================================================
// REGISTRY (for UI)
// =============================================================================

export {
  getServiceUiMeta,
  calculateOverallProgress,
  SERVICE_UI,
  DEPENDENCIES,
} from './registry';

// =============================================================================
// TYPES
// =============================================================================

export type {
  ServiceState,
  ServiceName,
  ServiceStates,
  ProvisionContext,
  ProvisionMetadata,
  ProvisionRun,
  StepResult,
  StepStatus,
} from './types';

export {
  INITIAL_SERVICE_STATES,
  isServiceComplete,
  isServiceActionable,
  allServicesComplete,
  allServicesReady,
  anyServiceFailed,
} from './types';

// =============================================================================
// LEGACY COMPATIBILITY
// =============================================================================

// Map old ProvisionState to new model for gradual migration
export type { ServiceState as ProvisionState } from './types';
