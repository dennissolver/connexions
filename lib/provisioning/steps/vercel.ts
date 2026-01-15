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

  // Create project (this will auto-trigger a deployment via GitHub integration)
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
  const teamQueryAmp = ctx.vercelTeamId ? `&teamId=${ctx.vercelTeamId}` : '';
  const headers = { Authorization: `Bearer ${ctx.vercelToken}`, 'Content-Type': 'application/json' };

  // If we have a deployment ID, check its status
  if (ctx.metadata.vercelDeploymentId) {
    const res = await fetch(`${VERCEL_API}/v13/deployments/${ctx.metadata.vercelDeploymentId}${teamQuery}`, { headers });
    if (res.ok) {
      const deployment = await res.json();
      console.log(`[vercel] Deployment ${ctx.metadata.vercelDeploymentId} state: ${deployment.readyState}`);

      if (deployment.readyState === 'READY') {
        return { nextState: 'ELEVENLABS_CREATING', metadata: ctx.metadata };
      }
      if (deployment.readyState === 'ERROR' || deployment.readyState === 'CANCELED') {
        // Reset and try again
        return { nextState: 'VERCEL_CREATING', metadata: { ...ctx.metadata, vercelDeploymentId: undefined } };
      }
      // Still building
      return { nextState: 'VERCEL_DEPLOYING', metadata: ctx.metadata };
    }
  }

  // No deployment ID - query for the latest deployment on this project
  const projectId = ctx.metadata.vercelProjectId;
  if (!projectId) {
    throw new Error('No Vercel project ID');
  }

  // Get latest deployments for this project
  const listRes = await fetch(
    `${VERCEL_API}/v6/deployments?projectId=${projectId}&limit=5${teamQueryAmp}`,
    { headers }
  );

  if (listRes.ok) {
    const data = await listRes.json();
    const deployments = data.deployments || [];

    console.log(`[vercel] Found ${deployments.length} deployments for project ${projectId}`);

    if (deployments.length > 0) {
      // Get the most recent deployment
      const latest = deployments[0];
      console.log(`[vercel] Latest deployment: ${latest.uid}, state: ${latest.readyState || latest.state}`);

      const state = latest.readyState || latest.state;

      if (state === 'READY') {
        return {
          nextState: 'ELEVENLABS_CREATING',
          metadata: { ...ctx.metadata, vercelDeploymentId: latest.uid }
        };
      }

      if (state === 'ERROR' || state === 'CANCELED') {
        // Need to trigger a new deployment - use deploy hook
        return await triggerViaDeployHook(ctx, headers, teamQuery);
      }

      // Building or queued - save the ID and wait
      return {
        nextState: 'VERCEL_DEPLOYING',
        metadata: { ...ctx.metadata, vercelDeploymentId: latest.uid }
      };
    }
  }

  // No deployments found - trigger via deploy hook
  console.log(`[vercel] No deployments found, triggering via deploy hook`);
  return await triggerViaDeployHook(ctx, headers, teamQuery);
}

async function triggerViaDeployHook(
  ctx: ProvisionContext,
  headers: Record<string, string>,
  teamQuery: string
): Promise<ProvisionStepResult> {
  const projectId = ctx.metadata.vercelProjectId;

  // First, check if a deploy hook exists, if not create one
  const hooksRes = await fetch(`${VERCEL_API}/v1/projects/${projectId}/deploy-hooks${teamQuery}`, { headers });

  let hookUrl: string | null = null;

  if (hooksRes.ok) {
    const hooks = await hooksRes.json();
    const existingHook = hooks.find?.((h: any) => h.name === 'provision-hook');
    if (existingHook) {
      hookUrl = existingHook.url;
    }
  }

  // Create hook if doesn't exist
  if (!hookUrl) {
    const createHookRes = await fetch(`${VERCEL_API}/v1/projects/${projectId}/deploy-hooks${teamQuery}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: 'provision-hook', ref: 'main' }),
    });

    if (createHookRes.ok) {
      const newHook = await createHookRes.json();
      hookUrl = newHook.url;
      console.log(`[vercel] Created deploy hook`);
    }
  }

  // Trigger the deploy hook
  if (hookUrl) {
    const triggerRes = await fetch(hookUrl, { method: 'POST' });
    if (triggerRes.ok) {
      const result = await triggerRes.json();
      console.log(`[vercel] Triggered deployment via hook: ${result.job?.id || 'pending'}`);

      // The hook doesn't return a deployment ID immediately,
      // so we'll pick it up on the next poll
      return { nextState: 'VERCEL_DEPLOYING', metadata: ctx.metadata };
    }
    console.error(`[vercel] Hook trigger failed: ${await triggerRes.text()}`);
  }

  // Fallback: try using the new createDeployment API without gitSource
  console.log(`[vercel] Trying direct deployment creation`);
  const deployRes = await fetch(`${VERCEL_API}/v13/deployments${teamQuery}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: ctx.projectSlug,
      project: projectId,
      target: 'production',
    }),
  });

  if (deployRes.ok) {
    const deployment = await deployRes.json();
    console.log(`[vercel] Triggered deployment: ${deployment.id}`);
    return {
      nextState: 'VERCEL_DEPLOYING',
      metadata: { ...ctx.metadata, vercelDeploymentId: deployment.id }
    };
  }

  const errorText = await deployRes.text();
  console.error(`[vercel] Failed to trigger deployment: ${errorText}`);

  // Don't throw - return deploying state and try again next poll
  return { nextState: 'VERCEL_DEPLOYING', metadata: ctx.metadata };
}

async function updateEnvVars(
  token: string,
  projectId: string,
  envVars: Record<string, string>,
  teamId?: string
): Promise<void> {
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