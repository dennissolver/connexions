import { ProvisionContext, ProvisionStepResult } from '../types';

export async function createVercelProject(
  ctx: ProvisionContext
): Promise<ProvisionStepResult> {
  // real Vercel project creation logic here

  return {
    nextState: 'VERCEL_READY',
    metadata: {
      vercelProjectId: 'prj_xxx',
      vercelUrl: 'https://example.vercel.app',
    },
  };
}
