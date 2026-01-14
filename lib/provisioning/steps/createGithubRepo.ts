import { ProvisionContext, ProvisionStepResult } from '../types';
// lib/provisioning/steps/createGithubRepo.ts

export async function createGithubRepo(
  ctx: ProvisionContext
): Promise<ProvisionStepResult> {
  if (ctx.metadata.githubRepo) {
    return {
      nextState: 'APPLY_SCHEMA',
      metadata: ctx.metadata,
    };
  }

  // ðŸ”’ REAL CALL GOES HERE
  // const repo = await github.repos.createForAuthenticatedUser(...)

  const repoName = `${ctx.projectSlug}-platform`;

  return {
    nextState: 'APPLY_SCHEMA',
    metadata: {
      ...ctx.metadata,
      githubRepo: repoName,
    },
  };
}

