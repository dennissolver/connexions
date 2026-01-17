// lib/provisioning/github/execute.ts
// Creates GitHub repo from template - no dependencies, starts immediately

import { ProvisionContext, StepResult } from '../types';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_ORG = process.env.GITHUB_ORG || 'connexions-platforms';
const TEMPLATE_REPO = process.env.GITHUB_TEMPLATE_REPO || 'universal-interviews';

export async function githubExecute(ctx: ProvisionContext): Promise<StepResult> {
  // Already have a repo? Skip (idempotent)
  if (ctx.metadata.github_repo) {
    console.log(`[github.execute] Already exists: ${ctx.metadata.github_repo}`);
    return { status: 'advance' };
  }

  if (!GITHUB_TOKEN) {
    return {
      status: 'fail',
      error: 'GITHUB_TOKEN not configured',
    };
  }

  const repoName = `cx-${ctx.projectSlug}`;

  try {
    // Check if already exists (previous failed attempt may have created it)
    const checkRes = await fetch(`https://api.github.com/repos/${GITHUB_ORG}/${repoName}`, {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
      },
    });

    if (checkRes.ok) {
      const existing = await checkRes.json();
      console.log(`[github.execute] Found existing: ${existing.full_name}`);
      return {
        status: 'advance',
        metadata: {
          github_repo: existing.full_name,
        },
      };
    }

    // Create from template
    const createRes = await fetch(
      `https://api.github.com/repos/${GITHUB_ORG}/${TEMPLATE_REPO}/generate`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github+json',
        },
        body: JSON.stringify({
          owner: GITHUB_ORG,
          name: repoName,
          description: `Interview platform for ${ctx.companyName}`,
          private: true,
          include_all_branches: false,
        }),
      }
    );

    if (!createRes.ok) {
      const text = await createRes.text();
      return {
        status: 'fail',
        error: `GitHub API error (${createRes.status}): ${text}`,
      };
    }

    const repo = await createRes.json();
    console.log(`[github.execute] Created: ${repo.full_name}`);

    return {
      status: 'advance',
      metadata: {
        github_repo: repo.full_name,
      },
    };
  } catch (err) {
    return {
      status: 'fail',
      error: `GitHub creation failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
