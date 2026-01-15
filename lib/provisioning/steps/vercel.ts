// lib/provisioning/steps/vercel.ts

import { ProvisionContext, ProvisionStepResult } from '../types';

const VERCEL_API = 'https://api.vercel.com';

export async function createVercelProject(ctx: ProvisionContext): Promise<ProvisionStepResult> {
  if (ctx.metadata.vercelProjectId) {
    return { nextState: 'VERCEL_CREATING', metadata: ctx.metadata };
  }

  const safeName = ctx.projectSlug.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 100);
  const teamQuery = ctx.vercelTeamId ? `?teamId=${ctx.vercelTeamId}` : '';
  const vercelUrl = `https://${safeName}.vercel.app`;
  const headers = { Authorization: `Bearer ${ctx.vercelToken}`, 'Content-Type': 'application/json' };

  const envVars: Record<string, string> = {
    NEXT_PUBLIC_SUPABASE_URL: ctx.metadata.supabaseUrl || '',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: ctx.metadata.supabaseAnonKey || '',
    SUPABASE_SERVICE_ROLE_KEY: ctx.metadata.supabaseServiceKey || '',
    NEXT_PUBLIC_PLATFORM_NAME: ctx.platformName,
    NEXT_PUBLIC_COMPANY_NAME: ctx.companyName,
    ELEVENLABS_API_KEY: ctx.elevenLabsApiKey,
    ELEVENLABS_AGENT_ID: ctx.metadata.elevenLabsAgentId || '',
    PARENT_WEBHOOK_URL: ctx.parentWebhookUrl,
  };

  // Check exists
  const checkRes = await fetch(`${VERCEL_API}/v9/projects/${safeName}${teamQuery}`, { headers });
  if (checkRes.ok) {
    const existing = await checkRes.json();
    await updateEnvVars(ctx.vercelToken, existing.id, envVars, ctx.vercelTeamId);
    return { nextState: 'VERCEL_CREATING', metadata: { ...ctx.metadata, vercelProjectId: existing.id, vercelUrl } };
  }

  // Create project
  const createRes = await fetch(`${VERCEL_API}/v10/projects${teamQuery}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: safeName,
      framework: 'nextjs',
      gitRepository: { type: 'github', repo: `${ctx.githubOwner}/${ctx.metadata.githubRepoName}` },
      environmentVariables: Object.entries(envVars).map(([key, value]) => ({
        key, value, target: ['production', 'preview', 'development'],
        type: key.includes('SECRET') || key.includes('SERVICE') || key.includes('API_KEY') ? 'encrypted' : 'plain',
      })),
    }),
  });

  if (!createRes.ok) throw new Error(`Vercel create failed: ${await createRes.text()}`);
  const project = await createRes.json();

  return { nextState: 'VERCEL_CREATING', metadata: { ...ctx.metadata, vercelProjectId: project.id, vercelUrl } };
}

export async function triggerVercelDeployment(ctx: ProvisionContext): Promise<ProvisionStepResult> {
  const teamQuery = ctx.vercelTeamId ? `?teamId=${ctx.vercelTeamId}` : '';
  const headers = { Authorization: `Bearer ${ctx.vercelToken}`, 'Content-Type': 'application/json' };

  // Check existing deployment
  if (ctx.metadata.vercelDeploymentId) {
    const res = await fetch(`${VERCEL_API}/v13/deployments/${ctx.metadata.vercelDeploymentId}${teamQuery}`, { headers });
    if (res.ok) {
      const deployment = await res.json();
      if (deployment.readyState === 'READY') return { nextState: 'ELEVENLABS_CREATING', metadata: ctx.metadata };
      if (deployment.readyState === 'ERROR' || deployment.readyState === 'CANCELED') {
        return { nextState: 'VERCEL_CREATING', metadata: { ...ctx.metadata, vercelDeploymentId: undefined } };
      }
      return { nextState: 'VERCEL_DEPLOYING', metadata: ctx.metadata };
    }
  }

  // Trigger deployment
  const deployRes = await fetch(`${VERCEL_API}/v13/deployments${teamQuery}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: ctx.projectSlug,
      project: ctx.metadata.vercelProjectId,
      target: 'production',
      gitSource: { type: 'github', repo: `${ctx.githubOwner}/${ctx.metadata.githubRepoName}`, ref: 'main' },
    }),
  });

  if (deployRes.ok) {
    const deployment = await deployRes.json();
    return { nextState: 'VERCEL_DEPLOYING', metadata: { ...ctx.metadata, vercelDeploymentId: deployment.id } };
  }

  return { nextState: 'VERCEL_DEPLOYING', metadata: ctx.metadata };
}

async function updateEnvVars(token: string, projectId: string, envVars: Record<string, string>, teamId?: string): Promise<void> {
  const teamQuery = teamId ? `?teamId=${teamId}` : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  for (const [key, value] of Object.entries(envVars)) {
    if (!value) continue;
    await fetch(`${VERCEL_API}/v10/projects/${projectId}/env${teamQuery}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        key, value, target: ['production', 'preview', 'development'],
        type: key.includes('SECRET') || key.includes('SERVICE') || key.includes('API_KEY') ? 'encrypted' : 'plain',
      }),
    }).catch(() => {});
  }
}
