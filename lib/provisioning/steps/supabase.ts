import { ProvisionContext, ProvisionStepResult } from '../types';

export async function createSupabaseProject(
  ctx: ProvisionContext
): Promise<ProvisionStepResult> {
  // … real Supabase logic …

  return {
    nextState: 'SUPABASE_READY',
    metadata: {
      supabaseProjectRef: 'abc123',
    },
  };
}
