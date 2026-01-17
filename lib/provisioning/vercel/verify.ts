// lib/provisioning/vercel/verify.ts
// Verifies Vercel deployment is ready and accessible
import { ProvisionContext, StepResult } from '../types';

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;

export async function vercelVerify(ctx: ProvisionContext): Promise<StepResult> {
  const projectId = ctx.metadata.vercel_project_id as string;
  const vercelUrl = ctx.metadata.vercel_url as string;
  const githubRepo = ctx.metadata.github_repo as string;

  if (!projectId) {
    return {
      status: 'fail',
      error: 'No vercel_project_id in metadata',
    };
  }

  try {
    // Check for deployment
    const deploymentsUrl = new URL('https://api.vercel.com/v6/deployments');
    deploymentsUrl.searchParams.set('projectId', projectId);
    deploymentsUrl.searchParams.set('limit', '1');
    if (VERCEL_TEAM_ID) deploymentsUrl.searchParams.set('teamId', VERCEL_TEAM_ID);

    const deploymentsRes = await fetch(deploymentsUrl.toString(), {
      headers: {
        'Authorization': `Bearer ${VERCEL_TOKEN}`,
      },
    });

    if (!deploymentsRes.ok) {
      console.log(`[vercel.verify] Could not fetch deployments: ${deploymentsRes.status}`);
      return { status: 'wait' };
    }

    const { deployments } = await deploymentsRes.json();

    if (!deployments || deployments.length === 0) {
      console.log('[vercel.verify] No deployments yet, triggering deployment...');
      
      // Trigger deployment if none exist
      if (githubRepo) {
        await triggerDeployment(projectId, githubRepo);
      }
      
      return { status: 'wait' };
    }

    const deployment = deployments[0];

    if (deployment.readyState !== 'READY') {
      console.log(`[vercel.verify] Deployment state: ${deployment.readyState}`);
      return { status: 'wait' };
    }

    // Health check the URL
    if (vercelUrl) {
      try {
        const healthRes = await fetch(vercelUrl, { method: 'HEAD' });
        if (!healthRes.ok && healthRes.status !== 404) {
          console.log(`[vercel.verify] Health check: ${healthRes.status}`);
          if (healthRes.status >= 500) {
            return { status: 'wait' };
          }
        }
      } catch {
        console.log('[vercel.verify] Health check failed, retrying...');
        return { status: 'wait' };
      }
    }

    console.log(`[vercel.verify] Verified: ${projectId}`);
    return {
      status: 'advance',
      metadata: {
        vercel_deployment_id: deployment.uid,
      },
    };
  } catch (err) {
    console.log(`[vercel.verify] Error, will retry: ${err}`);
    return { status: 'wait' };
  }
}

async function triggerDeployment(projectId: string, githubRepo: string): Promise<void> {
  try {
    const deployUrl = new URL('https://api.vercel.com/v13/deployments');
    if (VERCEL_TEAM_ID) deployUrl.searchParams.set('teamId', VERCEL_TEAM_ID);

    const res = await fetch(deployUrl.toString(), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: projectId,
        project: projectId,
        gitSource: {
          type: 'github',
          repo: githubRepo,
          ref: 'main',
        },
      }),
    });

    if (res.ok) {
      console.log(`[vercel.verify] Triggered deployment for ${projectId}`);
    } else {
      const text = await res.text();
      console.log(`[vercel.verify] Deployment trigger failed: ${text}`);
    }
  } catch (err) {
    console.log(`[vercel.verify] Deployment trigger error: ${err}`);
  }
}
