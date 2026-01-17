
import { ProvisionContext, ProvisionStepResult } from '../types';

export async function createGithubRepo(ctx: ProvisionContext): Promise<ProvisionStepResult> {
  return {
    nextState: 'GITHUB_VERIFYING',
    metadata: {
      ...ctx.metadata,
      githubRepo: ctx.metadata?.githubRepo,
    },
  };
}
