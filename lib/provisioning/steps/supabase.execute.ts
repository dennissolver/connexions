import { updateRun } from '../store';

export async function execute(run: any) {
  // assume supabase project already created earlier
  await updateRun(run.project_slug, { state: 'SUPABASE_VERIFYING' });
}
