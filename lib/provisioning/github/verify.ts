// lib/provisioning/github/verify.ts
// Verifies GitHub repo exists with expected files

import { ProvisionContext, StepResult } from '../types';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

export async function githubVerify(ctx: ProvisionContext): Promise<StepResult> {
  const repoFullName = ctx.metadata.github_repo as string;

  if (!repoFullName) {
    return {
      status: 'fail',
      error: 'No github_repo in metadata',
    };
  }

  try {
    // Check repo exists
    const repoRes = await fetch(`https://api.github.com/repos/${repoFullName}`, {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
      },
    });

    if (!repoRes.ok) {
      console.log(`[github.verify] Repo not found: ${repoRes.status}`);
      return { status: 'wait' };
    }

    // Check for package.json (template should have it)
    const fileRes = await fetch(
      `https://api.github.com/repos/${repoFullName}/contents/package.json`,
      {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github+json',
        },
      }
    );

    if (!fileRes.ok) {
      console.log(`[github.verify] package.json not found yet`);
      return { status: 'wait' };
    }

    // Get latest commit
    const commitsRes = await fetch(
      `https://api.github.com/repos/${repoFullName}/commits?per_page=1`,
      {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github+json',
        },
      }
    );

    if (!commitsRes.ok) {
      console.log(`[github.verify] Commits not available`);
      return { status: 'wait' };
    }

    const commits = await commitsRes.json();
    const commitSha = commits[0]?.sha;

    console.log(`[github.verify] Verified: ${repoFullName} @ ${commitSha?.slice(0, 7)}`);

    return {
      status: 'advance',
      metadata: {
        github_commit_sha: commitSha,
      },
    };
  } catch (err) {
    console.log(`[github.verify] Error, will retry: ${err}`);
    return { status: 'wait' };
  }
}
