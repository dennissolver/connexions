import { updateRun } from '../store';

export async function execute(run: any) {
  await updateRun(run.project_slug, { state: 'GITHUB_VERIFYING' });
}
