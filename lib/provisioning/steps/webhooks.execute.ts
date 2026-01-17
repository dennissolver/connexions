
import { ProvisionContext, StepResult } from '../types';

export async function webhookExecute(ctx: ProvisionContext): Promise<StepResult> {
  return { status: 'advance', next: 'COMPLETE' };
}
