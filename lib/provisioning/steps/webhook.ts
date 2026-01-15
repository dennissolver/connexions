// lib/provisioning/steps/webhook.ts

import { ProvisionContext, ProvisionStepResult } from '../types';

export async function registerWebhook(ctx: ProvisionContext): Promise<ProvisionStepResult> {
  if (ctx.metadata.webhookRegistered) {
    return { nextState: 'COMPLETE', metadata: ctx.metadata };
  }

  // Register with parent
  try {
    const registerUrl = ctx.parentWebhookUrl.replace('/child/transcript', '/webhooks/register-agent');
    await fetch(registerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platformName: ctx.platformName,
        companyName: ctx.companyName,
        projectSlug: ctx.projectSlug,
        childUrl: ctx.metadata.vercelUrl,
        supabaseUrl: ctx.metadata.supabaseUrl,
        elevenLabsAgentId: ctx.metadata.elevenLabsAgentId,
      }),
    });
  } catch (err) {
    console.warn('Parent registration failed:', err);
  }

  // Update Vercel env with agent ID (NEXT_PUBLIC_ so it's available client-side)
  if (ctx.metadata.elevenLabsAgentId && ctx.metadata.vercelProjectId) {
    const teamQuery = ctx.vercelTeamId ? `?teamId=${ctx.vercelTeamId}` : '';
    await fetch(`https://api.vercel.com/v10/projects/${ctx.metadata.vercelProjectId}/env${teamQuery}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ctx.vercelToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: 'NEXT_PUBLIC_ELEVENLABS_AGENT_ID',
        value: ctx.metadata.elevenLabsAgentId,
        target: ['production', 'preview', 'development'],
        type: 'plain', // NEXT_PUBLIC_ vars should be plain, not encrypted
      }),
    }).catch((err) => {
      console.warn('[webhook] Failed to set NEXT_PUBLIC_ELEVENLABS_AGENT_ID:', err);
    });
  }

  // Update child Supabase platforms table with Vercel URL
  if (ctx.metadata.supabaseUrl && ctx.metadata.supabaseServiceKey && ctx.metadata.vercelUrl) {
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
          vercel_url: ctx.metadata.vercelUrl,
          elevenlabs_agent_id: ctx.metadata.elevenLabsAgentId,
        }),
      });

      if (!response.ok) {
        console.warn('[webhook] Failed to update child Supabase with Vercel URL:', await response.text());
      } else {
        console.log('[webhook] Updated child Supabase with Vercel URL:', ctx.metadata.vercelUrl);
      }
    } catch (err) {
      console.warn('[webhook] Error updating child Supabase:', err);
    }
  }

  return { nextState: 'COMPLETE', metadata: { ...ctx.metadata, webhookRegistered: true } };
}