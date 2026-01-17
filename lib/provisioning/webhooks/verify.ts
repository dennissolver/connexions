// lib/provisioning/webhooks/verify.ts
// Verifies webhook endpoint is accessible

import { ProvisionContext, StepResult } from '../types';

export async function webhookVerify(ctx: ProvisionContext): Promise<StepResult> {
  const webhookUrl = ctx.metadata.webhook_url;

  if (!webhookUrl) {
    return {
      status: 'fail',
      error: 'No webhook URL in metadata',
    };
  }

  try {
    // Test that the webhook endpoint exists and responds
    // Most webhook endpoints return 405 for GET but that's fine - means it exists
    const res = await fetch(webhookUrl as string, {
      method: 'GET',
    });

    // Accept 200, 405 (method not allowed), or 401 (auth required) as valid
    // These all indicate the endpoint exists
    if (res.status === 200 || res.status === 405 || res.status === 401) {
      console.log(`[webhook.verify] Endpoint verified: ${res.status}`);
      return {
        status: 'advance',
      };
    }

    // 404 or 503 means not ready yet
    if (res.status === 404 || res.status === 503) {
      console.log(`[webhook.verify] Endpoint not ready: ${res.status}`);
      return {
        status: 'wait',
      };
    }

    // Other status codes - wait and retry
    console.log(`[webhook.verify] Unexpected status: ${res.status}`);
    return {
      status: 'wait',
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[webhook.verify] Error:`, msg);

    // Network errors - wait and retry
    return {
      status: 'wait',
    };
  }
}
