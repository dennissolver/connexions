// lib/provisioning/steps/vercel.ts
import { ProvisionContext, ProvisionStepResult } from '../types';

const VERCEL_API = 'https://api.vercel.com';
const GITHUB_API = 'https://api.github.com';

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
    NEXT_PUBLIC_ELEVENLABS_SETUP_AGENT_ID: ctx.metadata.elevenLabsAgentId || '',
    PARENT_WEBHOOK_URL: ctx.parentWebhookUrl,
  };

  // Check exists
  const checkRes = await fetch(`${VERCEL_API}/v9/projects/${safeName}${teamQuery}`, { headers });
  if (checkRes.ok) {
    const existing = await checkRes.json();
    await updateEnvVars(ctx.vercelToken, existing.id, envVars, ctx.vercelTeamId);
    return { nextState: 'VERCEL_CREATING', metadata: { ...ctx.metadata, vercelProjectId: existing.id, vercelUrl } };
  }

  // Create project linked to GitHub repo
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

  // Wait a moment for Vercel to set up the GitHub integration
  await new Promise(r => setTimeout(r, 2000));

  // Push a trigger commit to start the deployment
  await pushDeployTrigger(ctx.githubOwner, ctx.metadata.githubRepoName!, ctx.githubToken, vercelUrl);

  return { nextState: 'VERCEL_CREATING', metadata: { ...ctx.metadata, vercelProjectId: project.id, vercelUrl } };
}

async function pushDeployTrigger(owner: string, repo: string, token: string, vercelUrl: string): Promise<void> {
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
  };

  const filePath = '.deploy-trigger';
  const content = `# Deployment Trigger
Generated: ${new Date().toISOString()}
Platform URL: ${vercelUrl}
`;

  // Check if file exists to get SHA
  const checkRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${filePath}`, { headers });
  let sha: string | undefined;
  if (checkRes.ok) {
    const existing = await checkRes.json();
    sha = existing.sha;
  }

  // Create/update file to trigger Vercel deployment
  const pushRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${filePath}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      message: 'Trigger Vercel deployment',
      content: Buffer.from(content).toString('base64'),
      ...(sha ? { sha } : {})
    }),
  });

  if (!pushRes.ok) {
    console.error(`[vercel] Failed to push deploy trigger: ${await pushRes.text()}`);
  } else {
    console.log(`[vercel] Pushed deploy trigger to ${owner}/${repo}`);
  }
}

export async function triggerVercelDeployment(ctx: ProvisionContext): Promise<ProvisionStepResult> {
  const teamQuery = ctx.vercelTeamId ? `?teamId=${ctx.vercelTeamId}` : '';
  const teamQueryAmp = ctx.vercelTeamId ? `&teamId=${ctx.vercelTeamId}` : '';
  const headers = { Authorization: `Bearer ${ctx.vercelToken}`, 'Content-Type': 'application/json' };

  // Check deployment status
  const deploymentsRes = await fetch(
    `${VERCEL_API}/v6/deployments?projectId=${ctx.metadata.vercelProjectId}${teamQueryAmp}&limit=1`,
    { headers }
  );

  if (!deploymentsRes.ok) {
    return { nextState: 'VERCEL_DEPLOYING', metadata: ctx.metadata };
  }

  const { deployments } = await deploymentsRes.json();
  console.log(`[vercel] Found ${deployments.length} deployments for project ${ctx.metadata.vercelProjectId}`);

  if (deployments.length === 0) {
    // No deployments yet - push another trigger commit
    console.log('[vercel] No deployments found, pushing trigger commit');
    await pushDeployTrigger(
      ctx.githubOwner,
      ctx.metadata.githubRepoName!,
      ctx.githubToken,
      ctx.metadata.vercelUrl!
    );
    return { nextState: 'VERCEL_DEPLOYING', metadata: ctx.metadata };
  }

  const deployment = deployments[0];
  console.log(`[vercel] Deployment ${deployment.uid} state: ${deployment.readyState}`);

  // Store deployment ID
  const metadata = { ...ctx.metadata, vercelDeploymentId: deployment.uid };

  if (deployment.readyState === 'READY') {
    return { nextState: 'ELEVENLABS_CREATING', metadata };
  }

  if (deployment.readyState === 'ERROR' || deployment.readyState === 'CANCELED') {
    throw new Error(`Vercel deployment failed: ${deployment.readyState}`);
  }

  // Still building
  return { nextState: 'VERCEL_DEPLOYING', metadata };
}

async function updateEnvVars(
  token: string,
  projectId: string,
  envVars: Record<string, string>,
  teamId?: string
): Promise<void> {
  const teamQuery = teamId ? `?teamId=${teamId}` : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // Get existing env vars
  const existingRes = await fetch(`${VERCEL_API}/v10/projects/${projectId}/env${teamQuery}`, { headers });
  const existing = existingRes.ok ? (await existingRes.json()).envs || [] : [];
  const existingKeys = new Set(existing.map((e: any) => e.key));

  // Add missing env vars
  for (const [key, value] of Object.entries(envVars)) {
    if (!existingKeys.has(key)) {
      await fetch(`${VERCEL_API}/v10/projects/${projectId}/env${teamQuery}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          key,
          value,
          target: ['production', 'preview', 'development'],
          type: key.includes('SECRET') || key.includes('SERVICE') || key.includes('API_KEY') ? 'encrypted' : 'plain',
        }),
      });
    }
  }
}


