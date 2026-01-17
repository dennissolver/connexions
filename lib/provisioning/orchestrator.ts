// lib/provisioning/orchestrator.ts

import { advanceProvision } from './engine';
import { getProvisionRunBySlug } from './store';
import { ProvisionState } from './states';

const TERMINAL: ProvisionState[] = ['COMPLETE', 'FAILED'];

export async function runProvisioning(projectSlug: string) {
  while (true) {
    const run = await getProvisionRunBySlug(projectSlug);
    if (!run) throw new Error('Provision run missing');

    if (TERMINAL.includes(run.state as ProvisionState)) {
      return;
    }

    await advanceProvision(projectSlug);
  }
}
