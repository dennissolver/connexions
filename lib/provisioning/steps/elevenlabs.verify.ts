
import { ProvisionContext, StepResult } from '../types';

export async function elevenVerify(ctx: ProvisionContext): Promise<StepResult> {
  return { status: 'advance', next: 'WEBHOOK_EXECUTE' };
}
