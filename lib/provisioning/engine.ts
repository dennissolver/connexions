import { executeProvisionStep } from './executeStep';
import { isExecutableState, ProvisionState } from './states';
import { ProvisionContext } from './types';

export async function runProvisionStep(
  state: ProvisionState,
  ctx: ProvisionContext
) {
  if (!isExecutableState(state)) {
    return null;
  }

  return executeProvisionStep(state, ctx);
}
