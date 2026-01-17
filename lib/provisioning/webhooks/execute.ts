// lib/provisioning/webhooks/execute.ts
// Registers webhooks for the child platform

import { ProvisionContext, StepResult } from '../types';
import { generatePassword } from '../../security/passwords';

export async function webhookExecute(ctx: ProvisionContext): Promise<StepResult> {
  // Already have webhook secret? Skip (idempotent)
  if (ctx.metadata.webhook_secret) {
    console.log(`[webhook.execute] Webhook already configured`);
    return {
      status: 'advance',
      metadata: ctx.metadata,
    };
  }

  try {
    // Generate webhook secret
    const webhookSecret = generatePassword(32);

    // The webhook registration happens via updating the child platform's
    // environment variables and registering with ElevenLabs
    
    // For ElevenLabs, we need to register the webhook URL
    const webhookUrl = `${ctx.metadata.vercel_url}/api/webhooks/elevenlabs`;

    // TODO: Actually register with ElevenLabs when their API supports it
    // For now, the child platform will be configured to accept webhooks
    // and the parent platform will route based on agent ID

    console.log(`[webhook.execute] Webhook URL: ${webhookUrl}`);

    return {
      status: 'advance',
      metadata: {
        webhook_secret: webhookSecret,
        webhook_url: webhookUrl,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[webhook.execute] Failed:`, msg);

    return {
      status: 'fail',
      error: `Webhook registration failed: ${msg}`,
    };
  }
}
