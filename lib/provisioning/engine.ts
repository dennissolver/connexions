import { getRun, updateRun } from './store';
import { STEPS } from './steps';

export async function tickProvision(projectSlug: string) {
  const run = await getRun(projectSlug);
  if (!run) throw new Error("Run not found");

  const step = STEPS[run.state];
  if (!step) return;

  const result = await step.verify(run);
  if (result === 'WAIT') return;
  if (result === 'FAIL') {
    await updateRun(projectSlug, { state: 'FAILED' });
    return;
  }

  await step.execute(run);
}
