// lib/provisioning/webhooks/execute.ts
// Registers webhooks - DEPENDS ON: sandra, kira, vercel

import { ProvisionContext, StepResult } from '../types';

export async function webhooksExecute(ctx: ProvisionContext): Promise<StepResult> {
  // Already configured? Skip (idempotent)
  if (ctx.metadata.webhook_secret) {
    console.log(`[webhooks.execute] Already configured`);
    return { status: 'advance' };
  }

  // Dependencies are enforced by registry, but sanity check
  if (!ctx.metadata.vercel_url || !ctx.metadata.sandra_agent_id || !ctx.metadata.kira_agent_id) {
    return { status: 'wait' };
  }

  try {
    // Generate webhook secret
    const webhookSecret = generateSecret(32);
    const webhookUrl = `${ctx.metadata.vercel_url}/api/webhooks/elevenlabs`;

    // TODO: When ElevenLabs supports webhook registration via API, register here
    // For now, webhooks are configured in the child platform code to accept
    // callbacks, and the parent platform routes based on agent ID

    console.log(`[webhooks.execute] Configured: ${webhookUrl}`);

    return {
      status: 'advance',
      metadata: {
        webhook_secret: webhookSecret,
        webhook_url: webhookUrl,
      },
    };
  } catch (err) {
    return {
      status: 'fail',
      error: `Webhook setup failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

function generateSecret(length: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, x => chars[x % chars.length]).join('');
}
