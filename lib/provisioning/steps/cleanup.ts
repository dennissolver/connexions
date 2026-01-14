// lib/provisioning/steps/cleanup.ts

import { ProvisionContext, ProvisionStepResult } from '../types';

export async function cleanup(
  _ctx: ProvisionContext
): Promise<ProvisionStepResult> {
  return {
    nextState: 'COMPLETE',
  };
}
