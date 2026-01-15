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

  // Update Vercel env with agent ID
  if (ctx.metadata.elevenLabsAgentId && ctx.metadata.vercelProjectId) {
    const teamQuery = ctx.vercelTeamId ? `?teamId=${ctx.vercelTeamId}` : '';
    await fetch(`https://api.vercel.com/v10/projects/${ctx.metadata.vercelProjectId}/env${teamQuery}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ctx.vercelToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: 'ELEVENLABS_AGENT_ID',
        value: ctx.metadata.elevenLabsAgentId,
        target: ['production', 'preview', 'development'],
        type: 'encrypted',
      }),
    }).catch(() => {});
  }

  return { nextState: 'COMPLETE', metadata: { ...ctx.metadata, webhookRegistered: true } };
}
