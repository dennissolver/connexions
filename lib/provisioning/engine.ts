
import { RETRY_POLICIES } from './retryPolicies';
import { verify } from './verify';

export async function runVerification(component: string, ctx: any, advance: Function, fail: Function) {
  const policy = RETRY_POLICIES[component];
  for (let attempt = 1; attempt <= policy.maxRetries; attempt++) {
    const result = await verify(component, ctx);
    if (result.ok) {
      await advance();
      return;
    }
    if (!result.retryable) {
      await fail(result.reason);
      return;
    }
    const delay = Math.min(policy.baseDelayMs * 2 ** (attempt - 1), policy.maxDelayMs);
    await new Promise(r => setTimeout(r, delay));
  }
  await fail(`${component} verification timed out`);
}

// Compatibility exports (existing API expectations)
export async function getProvisionRun() {}
export async function createProvisionRun() {}
export async function deleteProvisionRun() {}
export async function advanceState() {}
export async function failRun() {}
