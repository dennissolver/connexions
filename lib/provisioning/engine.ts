// lib/provisioning/engine.ts

import { isExecutableState, EXECUTION_REGISTRY } from './registry';
import { ProvisionContext, ProvisionStepResult } from './types';
import { ProvisionState } from './states';
import { getProvisionRunBySlug, updateProvisionRun } from './store';

export async function advanceProvision(projectSlug: string) {
  const run = await getProvisionRunBySlug(projectSlug);
  if (!run) throw new Error(`Provision run not found: ${projectSlug}`);

  const state = run.state as ProvisionState;

  if (!isExecutableState(state)) {
    return; // terminal or waiting state
  }

  const executor = EXECUTION_REGISTRY[state];
  if (!executor) {
    throw new Error(`No executor registered for state ${state}`);
  }

  const ctx: ProvisionContext = {
    projectSlug,
    state,
    metadata: run.metadata ?? {},
  };

  let result: ProvisionStepResult;

  try {
    result = await executor(ctx);
  } catch (err: any) {
    await updateProvisionRun(projectSlug, {
      state: 'FAILED',
      last_error: err.message ?? 'Unknown error',
    });
    throw err;
  }

  if (!result?.nextState) {
    throw new Error(`Executor for ${state} returned no nextState`);
  }

  await updateProvisionRun(projectSlug, {
    state: result.nextState,
    metadata: result.metadata ?? run.metadata,
  });
}
