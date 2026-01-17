// lib/provisioning/types.ts
// Single source of truth for all provisioning types

// =============================================================================
// STATES
// =============================================================================

export type ExecutableState =
  | 'SUPABASE_CREATING'
  | 'GITHUB_CREATING'
  | 'VERCEL_CREATING'
  | 'SANDRA_CREATING'
  | 'KIRA_CREATING'
  | 'WEBHOOK_REGISTERING';

export type VerifyingState =
  | 'SUPABASE_VERIFYING'
  | 'GITHUB_VERIFYING'
  | 'VERCEL_VERIFYING'
  | 'SANDRA_VERIFYING'
  | 'KIRA_VERIFYING'
  | 'WEBHOOK_VERIFYING';

export type WaitingState =
  | 'WAITING_SUPABASE'
  | 'WAITING_GITHUB'
  | 'WAITING_VERCEL'
  | 'WAITING_SANDRA'
  | 'WAITING_KIRA';

export type ReadyState =
  | 'SUPABASE_READY'
  | 'GITHUB_READY'
  | 'VERCEL_READY'
  | 'SANDRA_READY'
  | 'KIRA_READY';

export type TerminalState =
  | 'COMPLETE'
  | 'FAILED';

export type ProvisionState =
  | ExecutableState
  | VerifyingState
  | WaitingState
  | ReadyState
  | TerminalState;

// =============================================================================
// STATE GUARDS
// =============================================================================

export function isExecutableState(state: ProvisionState): state is ExecutableState {
  return state.endsWith('_CREATING') || state === 'WEBHOOK_REGISTERING';
}

export function isVerifyingState(state: ProvisionState): state is VerifyingState {
  return state.endsWith('_VERIFYING');
}

export function isWaitingState(state: ProvisionState): state is WaitingState {
  return state.startsWith('WAITING_');
}

export function isReadyState(state: ProvisionState): state is ReadyState {
  return state.endsWith('_READY');
}

export function isTerminalState(state: ProvisionState): state is TerminalState {
  return state === 'COMPLETE' || state === 'FAILED';
}

// =============================================================================
// STEP INTERFACES
// =============================================================================

export type StepStatus = 'advance' | 'wait' | 'fail';

export interface StepResult {
  status: StepStatus;
  next?: ProvisionState;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface ProvisionContext {
  projectSlug: string;
  clientId: string;
  companyName: string;
  platformName: string;
  metadata: ProvisionMetadata;
}

// =============================================================================
// METADATA
// =============================================================================

export interface ProvisionMetadata {
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

  // Errors
  last_error?: string;
  error_count?: number;

  // Extensible
  [key: string]: unknown;
}

// =============================================================================
// DATABASE ROW
// =============================================================================

export interface ProvisionRun {
  id: string;
  project_slug: string;
  client_id: string;
  state: ProvisionState;
  metadata: ProvisionMetadata;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// STEP HANDLER SIGNATURE
// =============================================================================

export type StepHandler = (ctx: ProvisionContext) => Promise<StepResult>;
