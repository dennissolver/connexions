// lib/provisioning/webhooks/verify.ts
// Verifies webhook endpoint is accessible

import { ProvisionContext, StepResult } from '../types';

export async function webhooksVerify(ctx: ProvisionContext): Promise<StepResult> {
  const webhookUrl = ctx.metadata.webhook_url as string;

  if (!webhookUrl) {
    return {
      status: 'fail',
      error: 'No webhook_url in metadata',
    };
  }

  try {
    // Test that the endpoint exists
    // Most webhook endpoints return 405 for GET, which is fine - means it exists
    const res = await fetch(webhookUrl, { method: 'GET' });

    // Accept 200, 405 (method not allowed), 401 (auth required) as valid
    if (res.status === 200 || res.status === 405 || res.status === 401) {
      console.log(`[webhooks.verify] Endpoint verified: ${res.status}`);
      return { status: 'advance' };
    }

    // 404 or 503 means deployment not ready
    if (res.status === 404 || res.status === 503) {
      console.log(`[webhooks.verify] Endpoint not ready: ${res.status}`);
      return { status: 'wait' };
    }

    // Other errors - wait and retry
    console.log(`[webhooks.verify] Unexpected status: ${res.status}`);
    return { status: 'wait' };
  } catch (err) {
    console.log(`[webhooks.verify] Error, will retry: ${err}`);
    return { status: 'wait' };
  }
}
