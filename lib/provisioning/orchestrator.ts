
import { advance } from './engine';
import { getRun } from './store';
import { sleep } from './sleep';

export async function runProvisioningV2(projectSlug: string) {
  while (true) {
    const run = await getRun(projectSlug);
    if (!run || run.state === 'COMPLETE' || run.state === 'FAILED') return;
    await advance(projectSlug);
    await sleep(3000);
  }
}
