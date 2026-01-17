import { updateRun } from '../store';

export async function execute(run: any) {
  // deployment assumed triggered
  await updateRun(run.project_slug, { state: 'VERCEL_VERIFYING' });
}
