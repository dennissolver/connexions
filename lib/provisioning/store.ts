import { createClient } from '@supabase/supabase-js';
import { ProvisionRun } from './types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function getProvisionRunBySlug(projectSlug: string): Promise<ProvisionRun | null> {
  const { data } = await supabase
    .from('provision_runs')
    .select('*')
    .eq('project_slug', projectSlug)
    .single();
  return data ?? null;
}

export async function updateProvisionRunBySlug(
  projectSlug: string,
  patch: Partial<ProvisionRun>
) {
  await supabase
    .from('provision_runs')
    .update(patch)
    .eq('project_slug', projectSlug);
}

export async function deleteProvisionRunBySlug(projectSlug: string) {
  await supabase
    .from('provision_runs')
    .delete()
    .eq('project_slug', projectSlug);
}
