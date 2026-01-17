
import { ProvisionContext, ProvisionStepResult } from '../types';

export async function createVercelProject(ctx: ProvisionContext): Promise<ProvisionStepResult> {
  return {
    nextState: 'VERCEL_VERIFYING',
    metadata: {
      ...ctx.metadata,
      vercelProjectId: ctx.metadata?.vercelProjectId,
      vercelUrl: ctx.metadata?.vercelUrl,
    },
  };
}
