import { ExecutableState } from './states';
import { ProvisionContext, ProvisionStepResult } from './types';
import { STEPS } from './registry';

export async function executeProvisionStep(
  state: ExecutableState,
  context: ProvisionContext
): Promise<ProvisionStepResult> {
  return STEPS[state](context);
}
