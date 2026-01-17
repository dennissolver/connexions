
import { ProvisionContext, StepResult } from '../types';

export async function elevenExecute(ctx: ProvisionContext): Promise<StepResult> {
  return { status: 'advance', next: 'ELEVENLABS_VERIFY' };
}
