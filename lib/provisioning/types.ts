export type ProvisionExecutionState =
  | 'SUPABASE_CREATING'
  | 'GITHUB_CREATING'
  | 'VERCEL_CREATING'
  | 'SANDRA_CREATING'
  | 'KIRA_CREATING'
  | 'WEBHOOK_REGISTERING';

export type ProvisionTerminalState =
  | 'INIT'
  | 'SUPABASE_READY'
  | 'GITHUB_READY'
  | 'VERCEL_READY'
  | 'SANDRA_READY'
  | 'KIRA_READY'
  | 'COMPLETE'
  | 'FAILED';

export type ProvisionState =
  | ProvisionExecutionState
  | ProvisionTerminalState;

export interface ProvisionContext {
  projectSlug: string;
  state: ProvisionState;
  metadata: Record<string, any>;
}

export interface ProvisionStepResult {
  nextState: ProvisionState;
  metadata?: Record<string, any>;
}
