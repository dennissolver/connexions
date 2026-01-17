import { supabaseAdmin } from '@/lib/supabase/admin';
import { advanceProvision } from './engine';
import { ProvisionExecutionState } from './types';

const EXECUTABLE: ProvisionExecutionState[] = [
  'SUPABASE_CREATING',
  'GITHUB_CREATING',
  'VERCEL_CREATING',
  'SANDRA_CREATING',
  'KIRA_CREATING',
  'WEBHOOK_REGISTERING',
];

export async function runProvisioningCycle(projectSlug: string) {
  const { data: run } = await supabaseAdmin
    .from('provision_runs')
    .select('*')
    .eq('project_slug', projectSlug)
    .single();

  if (!run) return;
  if (!EXECUTABLE.includes(run.state)) return;

  await advanceProvision(run);
}
