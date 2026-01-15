// lib/provisioning/steps/webhook.ts

import { ProvisionContext, ProvisionStepResult } from '../types';
import { configureSupabaseAuth } from './supabase';

const VERCEL_API = 'https://api.vercel.com';

export async function registerWebhook(ctx: ProvisionContext): Promise<ProvisionStepResult> {
  if (ctx.metadata.webhookRegistered) {
    return { nextState: 'COMPLETE', metadata: ctx.metadata };
  }

  const vercelUrl = ctx.metadata.vercelUrl;
  const elevenLabsAgentId = ctx.metadata.elevenLabsAgentId;

  console.log('[webhook] Starting final configuration...');
  console.log('[webhook] Vercel URL:', vercelUrl);
  console.log('[webhook] ElevenLabs Agent ID:', elevenLabsAgentId);

  // 1. Configure Supabase Auth with actual Vercel URL
  console.log('[webhook] Step 1: Configuring Supabase auth URLs...');
  await configureSupabaseAuth(ctx);

  // 2. Update Vercel env with NEXT_PUBLIC_ELEVENLABS_AGENT_ID (now that we have it)
  console.log('[webhook] Step 2: Updating Vercel environment variables...');
  if (elevenLabsAgentId && ctx.metadata.vercelProjectId) {
    await updateVercelEnvVar(
      ctx.vercelToken,
      ctx.metadata.vercelProjectId,
      'NEXT_PUBLIC_ELEVENLABS_AGENT_ID',
      elevenLabsAgentId,
      ctx.vercelTeamId,
      'plain' // NEXT_PUBLIC_ vars must be plain, not encrypted
    );

    // Also ensure ELEVENLABS_AGENT_ID is set (for server-side use)
    await updateVercelEnvVar(
      ctx.vercelToken,
      ctx.metadata.vercelProjectId,
      'ELEVENLABS_AGENT_ID',
      elevenLabsAgentId,
      ctx.vercelTeamId,
      'encrypted'
    );
  }

  // 3. Register with parent platform
  console.log('[webhook] Step 3: Registering with parent platform...');
  try {
    const registerUrl = ctx.parentWebhookUrl.replace('/child/transcript', '/webhooks/register-agent');
    const registerRes = await fetch(registerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platformName: ctx.platformName,
        companyName: ctx.companyName,
        projectSlug: ctx.projectSlug,
        childUrl: vercelUrl,
        supabaseUrl: ctx.metadata.supabaseUrl,
        elevenLabsAgentId: elevenLabsAgentId,
      }),
    });
    if (registerRes.ok) {
      console.log('[webhook] Parent registration successful');
    } else {
      console.warn('[webhook] Parent registration failed:', await registerRes.text());
    }
  } catch (err) {
    console.warn('[webhook] Parent registration error:', err);
  }

  // 4. Update child Supabase platforms table
  console.log('[webhook] Step 4: Updating child Supabase platforms table...');
  if (ctx.metadata.supabaseUrl && ctx.metadata.supabaseServiceKey && vercelUrl) {
    try {
      const response = await fetch(`${ctx.metadata.supabaseUrl}/rest/v1/platforms?id=eq.1`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': ctx.metadata.supabaseAnonKey || '',
          'Authorization': `Bearer ${ctx.metadata.supabaseServiceKey}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          name: ctx.platformName,
          company_name: ctx.companyName,
          vercel_url: vercelUrl,
          supabase_url: ctx.metadata.supabaseUrl,
          elevenlabs_agent_id: elevenLabsAgentId,
        }),
      });

      if (!response.ok) {
        console.warn('[webhook] Failed to update child Supabase platforms table:', await response.text());
      } else {
        console.log('[webhook] Child Supabase platforms table updated');
      }
    } catch (err) {
      console.warn('[webhook] Error updating child Supabase:', err);
    }
  }

  // 5. Trigger a redeployment so the new env vars take effect
  console.log('[webhook] Step 5: Triggering redeployment...');
  if (ctx.metadata.vercelProjectId) {
    await triggerRedeployment(ctx);
  }

  console.log('[webhook] All configuration steps complete!');

  return {
    nextState: 'COMPLETE',
    metadata: {
      ...ctx.metadata,
      webhookRegistered: true,
      supabaseAuthConfigured: true,
      vercelEnvUpdated: true,
    }
  };
}

async function updateVercelEnvVar(
  token: string,
  projectId: string,
  key: string,
  value: string,
  teamId?: string,
  type: 'plain' | 'encrypted' = 'plain'
): Promise<void> {
  const teamQuery = teamId ? `?teamId=${teamId}` : '';
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // First, check if the env var exists
  const listRes = await fetch(`${VERCEL_API}/v10/projects/${projectId}/env${teamQuery}`, { headers });

  if (listRes.ok) {
    const { envs } = await listRes.json();
    const existing = envs?.find((e: any) => e.key === key);

    if (existing) {
      // Update existing env var
      const updateRes = await fetch(`${VERCEL_API}/v10/projects/${projectId}/env/${existing.id}${teamQuery}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          value,
          target: ['production', 'preview', 'development'],
          type,
        }),
      });

      if (updateRes.ok) {
        console.log(`[webhook] Updated env var: ${key}`);
      } else {
        console.warn(`[webhook] Failed to update env var ${key}:`, await updateRes.text());
      }
      return;
    }
  }

  // Create new env var
  const createRes = await fetch(`${VERCEL_API}/v10/projects/${projectId}/env${teamQuery}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      key,
      value,
      target: ['production', 'preview', 'development'],
      type,
    }),
  });

  if (createRes.ok) {
    console.log(`[webhook] Created env var: ${key}`);
  } else {
    console.warn(`[webhook] Failed to create env var ${key}:`, await createRes.text());
  }
}

async function triggerRedeployment(ctx: ProvisionContext): Promise<void> {
  const teamQuery = ctx.vercelTeamId ? `?teamId=${ctx.vercelTeamId}` : '';
  const headers = {
    Authorization: `Bearer ${ctx.vercelToken}`,
    'Content-Type': 'application/json',
  };

  try {
    // Get the latest deployment
    const deploymentsRes = await fetch(
      `${VERCEL_API}/v6/deployments?projectId=${ctx.metadata.vercelProjectId}&limit=1${ctx.vercelTeamId ? `&teamId=${ctx.vercelTeamId}` : ''}`,
      { headers }
    );

    if (!deploymentsRes.ok) {
      console.warn('[webhook] Failed to get deployments for redeployment');
      return;
    }

    const { deployments } = await deploymentsRes.json();
    if (deployments.length === 0) {
      console.warn('[webhook] No deployments found to redeploy');
      return;
    }

    const latestDeployment = deployments[0];

    // Trigger redeployment
    const redeployRes = await fetch(`${VERCEL_API}/v13/deployments${teamQuery}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: ctx.projectSlug,
        deploymentId: latestDeployment.uid,
        target: 'production',
      }),
    });

    if (redeployRes.ok) {
      console.log('[webhook] Triggered redeployment successfully');
    } else {
      // Try alternative method - just log, don't fail
      console.warn('[webhook] Redeployment API returned:', await redeployRes.text());
      console.log('[webhook] Note: Env vars will take effect on next deployment');
    }
  } catch (err) {
    console.warn('[webhook] Redeployment error:', err);
  }
}