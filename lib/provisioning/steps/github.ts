// lib/provisioning/steps/github.ts

import { ProvisionContext, ProvisionStepResult } from '../types';
import { TEMPLATE_FILES, generateClientConfig, generateReadme } from '../templates/child';

const GITHUB_API = 'https://api.github.com';

export async function createGithubRepo(ctx: ProvisionContext): Promise<ProvisionStepResult> {
  if (ctx.metadata.githubRepoName && ctx.metadata.githubRepoUrl) {
    return { nextState: 'GITHUB_READY', metadata: ctx.metadata };
  }

  const safeName = ctx.projectSlug.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 100);
  const headers = {
    Authorization: `Bearer ${ctx.githubToken}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
  };

  // Check exists
  const checkRes = await fetch(`${GITHUB_API}/repos/${ctx.githubOwner}/${safeName}`, { headers });
  if (checkRes.ok) {
    return {
      nextState: 'GITHUB_READY',
      metadata: { ...ctx.metadata, githubRepoName: safeName, githubRepoUrl: `https://github.com/${ctx.githubOwner}/${safeName}` },
    };
  }

  // Create repo
  const createRes = await fetch(`${GITHUB_API}/user/repos`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name: safeName, description: `AI Interview Platform for ${ctx.companyName}`, private: false, auto_init: true }),
  });
  if (!createRes.ok) throw new Error(`GitHub create failed: ${await createRes.text()}`);

  await new Promise(r => setTimeout(r, 3000));

  // Push template files
  for (const [path, content] of Object.entries(TEMPLATE_FILES)) {
    await pushFile(ctx.githubOwner, safeName, path, content, `Add ${path}`, headers);
    await new Promise(r => setTimeout(r, 200));
  }

  // Push config
  const configContent = generateClientConfig(ctx.platformName, ctx.companyName, ctx.colors);
  await pushFile(ctx.githubOwner, safeName, 'config/client.ts', configContent, 'Add client config', headers);

  // Push README
  const vercelUrl = `https://${safeName}.vercel.app`;
  const readmeContent = generateReadme(ctx.platformName, ctx.companyName, ctx.metadata.supabaseUrl, vercelUrl);
  await pushFile(ctx.githubOwner, safeName, 'README.md', readmeContent, 'Update README', headers);

  return {
    nextState: 'GITHUB_READY',
    metadata: { ...ctx.metadata, githubRepoName: safeName, githubRepoUrl: `https://github.com/${ctx.githubOwner}/${safeName}` },
  };
}

async function pushFile(owner: string, repo: string, path: string, content: string, message: string, headers: HeadersInit): Promise<void> {
  const checkRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`, { headers });
  let sha: string | undefined;
  if (checkRes.ok) sha = (await checkRes.json()).sha;

  await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ message, content: Buffer.from(content).toString('base64'), ...(sha ? { sha } : {}) }),
  });
}
