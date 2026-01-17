
import { ProvisionContext, ProvisionStepResult } from '../types';

export async function createSupabaseProject(ctx: ProvisionContext): Promise<ProvisionStepResult> {
  return {
    nextState: 'SUPABASE_VERIFYING',
    metadata: {
      ...ctx.metadata,
      supabaseProjectRef: ctx.metadata?.supabaseProjectRef,
    },
  };
}
