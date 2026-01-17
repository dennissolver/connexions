// lib/provisioning/finalize/execute.ts
// Finalizes child platform config - DEPENDS ON: sandra, kira, vercel
// Updates Vercel env vars with agent IDs and triggers redeploy

import { ProvisionContext, StepResult } from '../types';

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;

export async function finalizeExecute(ctx: ProvisionContext): Promise<StepResult> {
  // Already finalized? Skip
  if (ctx.metadata.finalized) {
    console.log(`[finalize.execute] Already finalized`);
    return { status: 'advance' };
  }

  if (!VERCEL_TOKEN) {
    return {
      status: 'fail',
      error: 'VERCEL_TOKEN not configured',
    };
  }

  const vercelProjectId = ctx.metadata.vercel_project_id as string;
  const sandraAgentId = ctx.metadata.sandra_agent_id as string;
  const kiraAgentId = ctx.metadata.kira_agent_id as string;

  if (!vercelProjectId || !sandraAgentId) {
    console.log(`[finalize.execute] Waiting for dependencies`);
    return { status: 'wait' };
  }

  try {
    // Add Sandra agent ID as env var
    await addEnvVar(vercelProjectId, 'NEXT_PUBLIC_ELEVENLABS_AGENT_ID', sandraAgentId, 'plain');
    console.log(`[finalize.execute] Added NEXT_PUBLIC_ELEVENLABS_AGENT_ID`);

    // Add Kira agent ID as env var (if exists)
    if (kiraAgentId) {
      await addEnvVar(vercelProjectId, 'NEXT_PUBLIC_KIRA_AGENT_ID', kiraAgentId, 'plain');
      console.log(`[finalize.execute] Added NEXT_PUBLIC_KIRA_AGENT_ID`);
    }

    // Trigger redeploy to pick up new env vars
    await triggerRedeploy(vercelProjectId);
    console.log(`[finalize.execute] Triggered redeploy`);

    return {
      status: 'advance',
      metadata: {
        finalized: true,
        finalized_at: new Date().toISOString(),
      },
    };
  } catch (err) {
    return {
      status: 'fail',
      error: `Finalize failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export async function finalizeVerify(ctx: ProvisionContext): Promise<StepResult> {
  // Check if the redeploy is complete
  const vercelProjectId = ctx.metadata.vercel_project_id as string;

  if (!vercelProjectId) {
    return { status: 'wait' };
  }

  try {
    // Check latest deployment status
    const deploymentsUrl = new URL(`https://api.vercel.com/v6/deployments`);
    deploymentsUrl.searchParams.set('projectId', vercelProjectId);
    deploymentsUrl.searchParams.set('limit', '1');
    if (VERCEL_TEAM_ID) deploymentsUrl.searchParams.set('teamId', VERCEL_TEAM_ID);

    const res = await fetch(deploymentsUrl.toString(), {
      headers: {
        'Authorization': `Bearer ${VERCEL_TOKEN}`,
      },
    });

    if (!res.ok) {
      console.log(`[finalize.verify] Could not fetch deployments`);
      return { status: 'wait' };
    }

    const { deployments } = await res.json();

    if (!deployments || deployments.length === 0) {
      console.log(`[finalize.verify] No deployments yet`);
      return { status: 'wait' };
    }

    const deployment = deployments[0];

    if (deployment.readyState !== 'READY') {
      console.log(`[finalize.verify] Deployment state: ${deployment.readyState}`);
      return { status: 'wait' };
    }

    console.log(`[finalize.verify] Verified - deployment ready`);

    return {
      status: 'advance',
      metadata: {
        final_deployment_id: deployment.uid,
      },
    };
  } catch (err) {
    console.log(`[finalize.verify] Error, will retry: ${err}`);
    return { status: 'wait' };
  }
}

// =============================================================================
// HELPERS
// =============================================================================

async function addEnvVar(
  projectId: string,
  key: string,
  value: string,
  type: 'plain' | 'encrypted'
): Promise<void> {
  const url = new URL(`https://api.vercel.com/v10/projects/${projectId}/env`);
  if (VERCEL_TEAM_ID) url.searchParams.set('teamId', VERCEL_TEAM_ID);

  // First try to delete existing (in case of re-run)
  try {
    const existingUrl = new URL(`https://api.vercel.com/v10/projects/${projectId}/env/${key}`);
    if (VERCEL_TEAM_ID) existingUrl.searchParams.set('teamId', VERCEL_TEAM_ID);

    await fetch(existingUrl.toString(), {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${VERCEL_TOKEN}`,
      },
    });
  } catch {
    // Ignore - might not exist
  }

  // Create new env var
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${VERCEL_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      key,
      value,
      target: ['production', 'preview', 'development'],
      type,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to add env var ${key}: ${text}`);
  }
}

async function triggerRedeploy(projectId: string): Promise<void> {
  // Get latest deployment to redeploy
  const deploymentsUrl = new URL(`https://api.vercel.com/v6/deployments`);
  deploymentsUrl.searchParams.set('projectId', projectId);
  deploymentsUrl.searchParams.set('limit', '1');
  deploymentsUrl.searchParams.set('state', 'READY');
  if (VERCEL_TEAM_ID) deploymentsUrl.searchParams.set('teamId', VERCEL_TEAM_ID);

  const deploymentsRes = await fetch(deploymentsUrl.toString(), {
    headers: {
      'Authorization': `Bearer ${VERCEL_TOKEN}`,
    },
  });

  if (!deploymentsRes.ok) {
    throw new Error('Could not fetch deployments for redeploy');
  }

  const { deployments } = await deploymentsRes.json();

  if (!deployments || deployments.length === 0) {
    throw new Error('No deployments found to redeploy');
  }

  const latestDeployment = deployments[0];

  // Trigger redeploy
  const redeployUrl = new URL(`https://api.vercel.com/v13/deployments`);
  if (VERCEL_TEAM_ID) redeployUrl.searchParams.set('teamId', VERCEL_TEAM_ID);

  const res = await fetch(redeployUrl.toString(), {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${VERCEL_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: latestDeployment.name,
      deploymentId: latestDeployment.uid,
      target: 'production',
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    // Non-fatal - deployment might still work
    console.warn(`[finalize] Redeploy request returned ${res.status}: ${text}`);
  }
}