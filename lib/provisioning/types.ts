// lib/provisioning/types.ts
// Core types for the parallel provisioning system

// =============================================================================
// SERVICE TYPES
// =============================================================================

export type ServiceName =
  | 'supabase'
  | 'github'
  | 'vercel'
  | 'supabase-config'
  | 'sandra'
  | 'kira'
  | 'webhooks'
  | 'finalize';

export type ServiceState =
  | 'PENDING'   // Not started, waiting for dependencies
  | 'CREATING'  // Execute in progress
  | 'VERIFYING' // Verify in progress
  | 'WAITING'   // Verify returned wait, will retry
  | 'READY'     // Complete and verified
  | 'FAILED';   // Failed with error

export type ServiceStates = Record<ServiceName, ServiceState>;

export const INITIAL_SERVICE_STATES: ServiceStates = {
  supabase: 'PENDING',
  github: 'PENDING',
  vercel: 'PENDING',
  'supabase-config': 'PENDING',
  sandra: 'PENDING',
  kira: 'PENDING',
  webhooks: 'PENDING',
  finalize: 'PENDING',
};

// =============================================================================
// PROVISION RUN
// =============================================================================

export interface ProvisionMetadata {
  // Setup info
  company_name?: string;
  platform_name?: string;
  contactEmail?: string;

  // Supabase
  supabase_project_ref?: string;
  supabase_url?: string;
  supabase_anon_key?: string;
  supabase_service_role_key?: string;
  supabase_urls_configured?: boolean;

  // GitHub
  github_repo?: string;
  github_commit_sha?: string;

  // Vercel
  vercel_project_id?: string;
  vercel_url?: string;
  vercel_deployment_id?: string;

  // ElevenLabs agents
  sandra_agent_id?: string;
  kira_agent_id?: string;

  // Webhooks
  webhook_secret?: string;
  webhook_url?: string;

  // Errors (stored in metadata for history)
  supabase_error?: string;
  github_error?: string;
  vercel_error?: string;
  sandra_error?: string;
  kira_error?: string;
  webhooks_error?: string;
  'supabase-config_error'?: string;

  // Allow additional fields
  [key: string]: unknown;
}

export interface ProvisionRun {
  id: string;
  project_slug: string;
  client_id?: string;

  // Service states
  supabase_state: ServiceState;
  github_state: ServiceState;
  vercel_state: ServiceState;
  'supabase-config_state'?: ServiceState;
  sandra_state: ServiceState;
  kira_state: ServiceState;
  webhooks_state: ServiceState;

  // Overall status
  status: 'running' | 'complete' | 'failed';

  // All metadata in one JSONB column
  metadata: ProvisionMetadata;

  created_at: string;
  updated_at: string;
}

// =============================================================================
// CONTEXT FOR HANDLERS
// =============================================================================

export interface ProvisionContext {
  projectSlug: string;
  clientId?: string;
  companyName: string;
  platformName: string;
  metadata: ProvisionMetadata;
  services: ServiceStates;
}

// =============================================================================
// STEP RESULTS
// =============================================================================

export type StepStatus = 'advance' | 'wait' | 'fail';

export interface StepResult {
  status: StepStatus;
  error?: string;
  metadata?: Partial<ProvisionMetadata>;
}

export type ExecuteHandler = (ctx: ProvisionContext) => Promise<StepResult>;
export type VerifyHandler = (ctx: ProvisionContext) => Promise<StepResult>;

// =============================================================================
// HELPERS
// =============================================================================

export function isServiceActionable(state: ServiceState): boolean {
  return state !== 'READY' && state !== 'FAILED';
}

export function allServicesComplete(services: ServiceStates): boolean {
  return Object.values(services).every(
    state => state === 'READY' || state === 'FAILED'
  );
}

export function allServicesReady(services: ServiceStates): boolean {
  return Object.values(services).every(state => state === 'READY');
}

export function anyServiceFailed(services: ServiceStates): boolean {
  return Object.values(services).some(state => state === 'FAILED');
}