// lib/provisioning/vercel/verify.ts
// Verifies Vercel deployment is ready

import { ProvisionContext, StepResult } from '../types';
import { getProject, getLatestDeployment } from './client';

export async function vercelVerify(ctx: ProvisionContext): Promise<StepResult> {
  const projectId = ctx.metadata.vercel_project_id;

  if (!projectId) {
    return {
      status: 'fail',
      error: 'No Vercel project ID in metadata',
    };
  }

  try {
    // Verify project exists
    const project = await getProject(projectId as string);
    if (!project) {
      console.log(`[vercel.verify] Project ${projectId} not found`);
      return {
        status: 'wait',
      };
    }

    // Check for deployment
    const deployment = await getLatestDeployment(projectId as string);
    if (!deployment) {
      console.log(`[vercel.verify] No deployment found for ${projectId}`);
      return {
        status: 'wait',
      };
    }

    // Check deployment state
    if (deployment.readyState !== 'READY') {
      console.log(`[vercel.verify] Deployment ${deployment.id} not ready: ${deployment.readyState}`);
      return {
        status: 'wait',
      };
    }

    // Optional: Health check the deployment URL
    const deploymentUrl = ctx.metadata.vercel_url as string;
    if (deploymentUrl) {
      try {
        const res = await fetch(deploymentUrl, { method: 'HEAD' });
        if (!res.ok) {
          console.log(`[vercel.verify] Health check failed: ${res.status}`);
          return {
            status: 'wait',
          };
        }
      } catch {
        console.log(`[vercel.verify] Health check error, waiting...`);
        return {
          status: 'wait',
        };
      }
    }

    console.log(`[vercel.verify] Deployment ${deployment.id} verified`);

    return {
      status: 'advance',
      metadata: {
        vercel_deployment_id: deployment.id,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[vercel.verify] Error:`, msg);

    return {
      status: 'wait',
    };
  }
}
