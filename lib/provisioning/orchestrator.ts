// lib/provisioning/orchestrator.ts

import { getProvisionRun, createProvisionRun, advanceState, failRun } from './engine';
import { ProvisionState, ALLOWED_TRANSITIONS } from './states';
import { ProvisionContext, ProvisionRun } from './types';
import { STEPS, isTerminalState } from './steps';

function buildContext(run: ProvisionRun, publicBaseUrl: string): ProvisionContext {
  return {
    projectSlug: run.project_slug,
    platformName: run.platform_name,
    companyName: run.company_name,
    metadata: run.metadata || {},
    publicBaseUrl,
    parentWebhookUrl: `${publicBaseUrl}/api/webhooks/elevenlabs-router`,
    supabaseToken: process.env.SUPABASE_ACCESS_TOKEN!,
    supabaseOrgId: process.env.SUPABASE_ORG_ID!,
    githubToken: process.env.GITHUB_TOKEN!,
    githubOwner: process.env.GITHUB_OWNER || 'dennissolver',
    vercelToken: process.env.VERCEL_TOKEN!,
    vercelTeamId: process.env.VERCEL_TEAM_ID,
    elevenLabsApiKey: process.env.ELEVENLABS_API_KEY!,
    elevenLabsWebhookSecret: process.env.ELEVENLABS_WEBHOOK_SECRET,
    colors: { primary: '#8B5CF6', accent: '#10B981', background: '#0F172A' },
  };
}

export async function runProvisioningStep(projectSlug: string, publicBaseUrl: string): Promise<ProvisionRun | null> {
  const run = await getProvisionRun(projectSlug);
  if (!run || isTerminalState(run.state as ProvisionState)) return run;

  const ctx = buildContext(run, publicBaseUrl);
  const step = STEPS[run.state as ProvisionState];

  try {
    if (!step) return run;
    const result = await step(ctx);
    if (!result.nextState) return run;

    await advanceState(projectSlug, run.state as ProvisionState, result.nextState, result.metadata);
    return getProvisionRun(projectSlug);
  } catch (err: any) {
    console.error(`[${projectSlug}] Step failed:`, err.message);
    await failRun(projectSlug, err.message);
    throw err;
  }
}

export async function runOrchestrator(projectSlug: string, publicBaseUrl: string, maxSteps = 20): Promise<ProvisionRun | null> {
  for (let i = 0; i < maxSteps; i++) {
    const run = await runProvisioningStep(projectSlug, publicBaseUrl);
    if (!run || isTerminalState(run.state as ProvisionState)) return run;
    await new Promise(r => setTimeout(r, run.state === 'VERCEL_DEPLOYING' ? 5000 : 1000));
  }
  return getProvisionRun(projectSlug);
}

export async function startProvisioning(projectSlug: string, platformName: string, companyName: string, publicBaseUrl: string): Promise<ProvisionRun> {
  const run = await createProvisionRun(projectSlug, platformName, companyName);
  runOrchestrator(projectSlug, publicBaseUrl).catch(err => console.error(`[${projectSlug}] Orchestrator error:`, err));
  return run;
}
