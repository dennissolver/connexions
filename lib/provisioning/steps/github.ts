import { ProvisionContext, ProvisionStepResult } from '../types';

export async function createGithubRepo(
  ctx: ProvisionContext
): Promise<ProvisionStepResult> {
  // real GitHub repo creation logic here

  return {
    nextState: 'GITHUB_READY',
    metadata: {
      githubRepo: 'owner/repo',
    },
  };
}
