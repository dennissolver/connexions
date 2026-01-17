
export type ExecutableState =
  | 'SUPABASE_EXECUTE'
  | 'SUPABASE_VERIFY'
  | 'GITHUB_EXECUTE'
  | 'GITHUB_VERIFY'
  | 'VERCEL_EXECUTE'
  | 'VERCEL_VERIFY'
  | 'ELEVENLABS_EXECUTE'
  | 'ELEVENLABS_VERIFY'
  | 'WEBHOOK_EXECUTE';

export type TerminalState = 'COMPLETE' | 'FAILED' | 'WAITING';

export type ProvisionState = ExecutableState | TerminalState;

export interface ProvisionContext {
  projectSlug: string;
  metadata: Record<string, any>;
}

export type StepResult =
  | { status: 'advance'; next: ProvisionState; metadata?: Record<string, any> }
  | { status: 'wait' }
  | { status: 'fail'; error: string };
