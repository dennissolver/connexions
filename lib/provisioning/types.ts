// lib/provisioning/types.ts
// Parallel execution model - each service has independent state

// =============================================================================
// PER-SERVICE STATES
// =============================================================================

export type ServiceState = 
  | 'PENDING'    // Not yet started
  | 'CREATING'   // Execution in progress
  | 'VERIFYING'  // Checking invariants
  | 'WAITING'    // Dependency not ready, will retry
  | 'READY'      // Verified complete
  | 'FAILED';    // Unrecoverable error

export type ServiceName = 
  | 'supabase'
  | 'github'
  | 'vercel'
  | 'sandra'
  | 'kira'
  | 'webhooks';

// =============================================================================
// STEP INTERFACES
// =============================================================================

export type StepStatus = 'advance' | 'wait' | 'fail';

export interface StepResult {
  status: StepStatus;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface ProvisionContext {
  projectSlug: string;
  clientId: string | null;
  companyName: string;
  platformName: string;
  metadata: ProvisionMetadata;
  // Current state of all services (for dependency checks)
  services: ServiceStates;
}

// =============================================================================
// SERVICE STATES
// =============================================================================

export interface ServiceStates {
  supabase: ServiceState;
  github: ServiceState;
  vercel: ServiceState;
  sandra: ServiceState;
  kira: ServiceState;
  webhooks: ServiceState;
}

export const INITIAL_SERVICE_STATES: ServiceStates = {
  supabase: 'PENDING',
  github: 'PENDING',
  vercel: 'PENDING',
  sandra: 'PENDING',
  kira: 'PENDING',
  webhooks: 'PENDING',
};

// =============================================================================
// METADATA
// =============================================================================

export interface ProvisionMetadata {
  // Setup info
  company_name?: string;
  platform_name?: string;
  contact_email?: string;
  owner_name?: string;
  owner_role?: string;
  voice_preference?: string;

  // Supabase
  supabase_project_ref?: string;
  supabase_url?: string;
  supabase_anon_key?: string;
  supabase_service_role_key?: string;

  // GitHub
  github_repo?: string;
  github_commit_sha?: string;

  // Vercel
  vercel_project_id?: string;
  vercel_url?: string;
  vercel_deployment_id?: string;

  // ElevenLabs
  sandra_agent_id?: string;
  kira_agent_id?: string;

  // Webhooks
  webhook_secret?: string;
  webhook_url?: string;

  // Errors (per service)
  supabase_error?: string;
  github_error?: string;
  vercel_error?: string;
  sandra_error?: string;
  kira_error?: string;
  webhooks_error?: string;

  // Extensible
  [key: string]: unknown;
}

// =============================================================================
// DATABASE ROW
// =============================================================================

export interface ProvisionRun {
  id: string;
  project_slug: string;
  client_id: string | null;
  
  // Per-service states
  supabase_state: ServiceState;
  github_state: ServiceState;
  vercel_state: ServiceState;
  sandra_state: ServiceState;
  kira_state: ServiceState;
  webhooks_state: ServiceState;
  
  // Overall status
  status: 'running' | 'complete' | 'failed';
  
  metadata: ProvisionMetadata;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// STEP HANDLER SIGNATURE
// =============================================================================

export type ExecuteHandler = (ctx: ProvisionContext) => Promise<StepResult>;
export type VerifyHandler = (ctx: ProvisionContext) => Promise<StepResult>;

// =============================================================================
// HELPERS
// =============================================================================

export function isServiceComplete(state: ServiceState): boolean {
  return state === 'READY' || state === 'FAILED';
}

export function isServiceActionable(state: ServiceState): boolean {
  // Can we do something with this service?
  return state === 'PENDING' || state === 'CREATING' || state === 'VERIFYING' || state === 'WAITING';
}

export function allServicesComplete(services: ServiceStates): boolean {
  return Object.values(services).every(isServiceComplete);
}

export function allServicesReady(services: ServiceStates): boolean {
  return Object.values(services).every(s => s === 'READY');
}

export function anyServiceFailed(services: ServiceStates): boolean {
  return Object.values(services).some(s => s === 'FAILED');
}
