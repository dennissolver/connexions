export type ExecutableState =
  | 'SUPABASE_CREATING'
  | 'GITHUB_CREATING'
  | 'VERCEL_CREATING'
  | 'SANDRA_CREATING'
  | 'KIRA_CREATING'
  | 'WEBHOOK_REGISTERING';

export type TerminalState =
  | 'SUPABASE_READY'
  | 'GITHUB_READY'
  | 'VERCEL_READY'
  | 'SANDRA_READY'
  | 'KIRA_READY'
  | 'COMPLETE'
  | 'FAILED';

export type ProvisionState = ExecutableState | TerminalState;

export function isExecutableState(
  state: ProvisionState
): state is ExecutableState {
  return (
    state.endsWith('_CREATING') ||
    state === 'WEBHOOK_REGISTERING'
  );
}
