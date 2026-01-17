
import { ProvisionContext, ProvisionStepResult } from '../types';

export async function cleanup(ctx: ProvisionContext): Promise<ProvisionStepResult> {
  // Cleanup never declares readiness; it just completes its action
  return {
    nextState: 'INIT',
    metadata: ctx.metadata,
  };
}
