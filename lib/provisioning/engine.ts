
// lib/provisioning/engine.ts
import { verifyComponent } from './verify';
import { RETRY_POLICIES } from './retryPolicies';
import { sleep } from './utils';

export async function runVerificationLoop(component: string, ctx: any, transition: (s: string) => Promise<void>, fail: (e: string) => Promise<void>) {
  const policy = RETRY_POLICIES[component];
  if (!policy) throw new Error(`No retry policy for ${component}`);

  for (let attempt = 1; attempt <= policy.maxRetries; attempt++) {
    const result = await verifyComponent(component, ctx);

    if (result.ok) {
      await transition(`${component.toUpperCase()}_READY`);
      return;
    }

    if (!result.retryable) {
      await fail(result.reason || 'Verification failed');
      return;
    }

    const delay = Math.min(policy.baseDelayMs * 2 ** (attempt - 1), policy.maxDelayMs);
    await sleep(delay);
  }

  await fail(`${component} did not become ready after ${policy.maxRetries} attempts`);
}
