
import { ProvisionContext, ProvisionStepResult } from '../types';

export async function registerWebhooks(ctx: ProvisionContext): Promise<ProvisionStepResult> {
  return {
    nextState: 'WEBHOOK_VERIFYING',
    metadata: ctx.metadata,
  };
}
