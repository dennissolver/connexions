// lib/provisioning/executeStep.ts

import { ProvisionState } from './states';
import { ProvisionContext, ProvisionStepResult } from './types';
import { STEPS } from './steps';

export async function executeProvisionStep(
  state: ProvisionState,
  context: ProvisionContext
): Promise<ProvisionStepResult> {
  const step = STEPS[state];

  if (!step) {
    return {};
  }

  return step(context);
}
