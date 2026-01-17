import { ProvisionContext, ProvisionStepResult } from '../types';

export async function registerWebhooks(
  ctx: ProvisionContext
): Promise<ProvisionStepResult> {
  // real webhook registration logic here

  return {
    nextState: 'COMPLETE',
    metadata: {
      webhooksRegistered: true,
    },
  };
}
