// lib/provisioning/github/verify.ts
// Verifies GitHub repository exists with expected structure

import { ProvisionContext, StepResult } from '../types';
import { getRepo, getLatestCommit, fileExists } from './client';

export async function githubVerify(ctx: ProvisionContext): Promise<StepResult> {
  const repoFullName = ctx.metadata.github_repo;

  if (!repoFullName) {
    return {
      status: 'fail',
      error: 'No GitHub repo in metadata',
    };
  }

  // Extract repo name from full name (org/repo)
  const repoName = (repoFullName as string).split('/')[1];

  try {
    // Verify repo exists
    const repo = await getRepo(repoName);
    if (!repo) {
      console.log(`[github.verify] Repo ${repoName} not found`);
      return {
        status: 'wait',
      };
    }

    // Verify expected files exist (template should have these)
    const hasPackageJson = await fileExists(repoName, 'package.json');
    if (!hasPackageJson) {
      console.log(`[github.verify] package.json not found in ${repoName}`);
      return {
        status: 'wait',
      };
    }

    // Get latest commit
    const commit = await getLatestCommit(repoName);
    if (!commit) {
      console.log(`[github.verify] No commits found in ${repoName}`);
      return {
        status: 'wait',
      };
    }

    console.log(`[github.verify] Repo ${repoName} verified, commit: ${commit.sha.slice(0, 7)}`);

    return {
      status: 'advance',
      metadata: {
        github_commit_sha: commit.sha,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[github.verify] Error:`, msg);

    return {
      status: 'wait',
    };
  }
}
