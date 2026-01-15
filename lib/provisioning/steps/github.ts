// lib/provisioning/steps/github.ts

import { ProvisionContext, ProvisionStepResult } from '../types';

const GITHUB_API = 'https://api.github.com';
const TEMPLATE_REPO = 'dennissolver/universal-interviews';

export async function createGithubRepo(ctx: ProvisionContext): Promise<ProvisionStepResult> {
  // Already done?
  if (ctx.metadata.githubRepoName && ctx.metadata.githubRepoUrl) {
    return { nextState: 'GITHUB_READY', metadata: ctx.metadata };
  }

  const safeName = ctx.projectSlug.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 100);
  const headers = {
    Authorization: `Bearer ${ctx.githubToken}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
  };

  // Check if repo already exists
  const checkRes = await fetch(`${GITHUB_API}/repos/${ctx.githubOwner}/${safeName}`, { headers });
  if (checkRes.ok) {
    return {
      nextState: 'GITHUB_READY',
      metadata: {
        ...ctx.metadata,
        githubRepoName: safeName,
        githubRepoUrl: `https://github.com/${ctx.githubOwner}/${safeName}`
      },
    };
  }

  // Create repo FROM template
  const createRes = await fetch(`${GITHUB_API}/repos/${TEMPLATE_REPO}/generate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      owner: ctx.githubOwner,
      name: safeName,
      description: `AI Interview Platform for ${ctx.companyName}`,
      private: false,
      include_all_branches: false,
    }),
  });

  if (!createRes.ok) {
    const errorText = await createRes.text();
    throw new Error(`GitHub template create failed: ${errorText}`);
  }

  const repo = await createRes.json();

  // Wait for repo to be ready
  await new Promise(r => setTimeout(r, 3000));

  // Update config/client.ts with platform-specific values
  await updateClientConfig(ctx, safeName, headers);

  // Update README
  await updateReadme(ctx, safeName, headers);

  return {
    nextState: 'GITHUB_READY',
    metadata: {
      ...ctx.metadata,
      githubRepoName: safeName,
      githubRepoUrl: `https://github.com/${ctx.githubOwner}/${safeName}`
    },
  };
}

async function updateClientConfig(ctx: ProvisionContext, repoName: string, headers: HeadersInit): Promise<void> {
  const configContent = `// config/client.ts
export const clientConfig = {
  platform: { 
    name: "${ctx.platformName}", 
    tagline: "AI-Powered Interviews",
    description: "AI-Powered Interview Platform" 
  },
  company: { 
    name: "${ctx.companyName}", 
    supportEmail: "support@example.com" 
  },
  theme: { 
    colors: { 
      primary: "${ctx.colors.primary}", 
      accent: "${ctx.colors.accent}", 
      background: "${ctx.colors.background}" 
    } 
  },
} as const;
`;

  await pushFile(ctx.githubOwner, repoName, 'config/client.ts', configContent, 'Configure platform settings', headers);
}

async function updateReadme(ctx: ProvisionContext, repoName: string, headers: HeadersInit): Promise<void> {
  const vercelUrl = `https://${repoName}.vercel.app`;
  const readmeContent = `# ${ctx.platformName}

AI Interview Platform for ${ctx.companyName}

## Links
- **Platform**: ${vercelUrl}
- **Supabase**: ${ctx.metadata.supabaseUrl || 'TBD'}

## Powered by Connexions
`;

  await pushFile(ctx.githubOwner, repoName, 'README.md', readmeContent, 'Update README', headers);
}

async function pushFile(
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  headers: HeadersInit
): Promise<void> {
  // Check if file exists to get SHA
  const checkRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`, { headers });
  let sha: string | undefined;
  if (checkRes.ok) {
    const existing = await checkRes.json();
    sha = existing.sha;
  }

  // Create or update file
  await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      message,
      content: Buffer.from(content).toString('base64'),
      ...(sha ? { sha } : {})
    }),
  });
}

