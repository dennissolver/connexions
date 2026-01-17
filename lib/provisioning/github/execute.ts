// lib/provisioning/github/execute.ts
// Creates GitHub repository from template - idempotent

import { ProvisionContext, StepResult } from '../types';
import { createRepoFromTemplate, getRepo, getRepoFullName } from './client';

export async function githubExecute(ctx: ProvisionContext): Promise<StepResult> {
  const repoName = `cx-${ctx.projectSlug}`;

  // Already have a repo? Skip creation (idempotent)
  if (ctx.metadata.github_repo) {
    console.log(`[github.execute] Repo already exists: ${ctx.metadata.github_repo}`);
    return {
      status: 'advance',
      metadata: ctx.metadata,
    };
  }

  try {
    // Check if repo already exists (may have been created in previous attempt)
    const existing = await getRepo(repoName);
    if (existing) {
      console.log(`[github.execute] Found existing repo: ${existing.full_name}`);
      return {
        status: 'advance',
        metadata: {
          github_repo: existing.full_name,
        },
      };
    }

    // Create from template
    const repo = await createRepoFromTemplate(
      repoName,
      `Interview platform for ${ctx.companyName}`
    );

    console.log(`[github.execute] Created repo: ${repo.full_name}`);

    return {
      status: 'advance',
      metadata: {
        github_repo: repo.full_name,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[github.execute] Failed:`, msg);

    return {
      status: 'fail',
      error: `GitHub repo creation failed: ${msg}`,
    };
  }
}
