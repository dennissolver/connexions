import { supabaseAdmin } from '@/lib/supabase/admin';
import { ProvisionRun } from './types';

export async function getProvisionRunBySlug(projectSlug: string): Promise<ProvisionRun | null> {
  const { data, error } = await supabaseAdmin
    .from('provision_runs')
    .select('*')
    .eq('project_slug', projectSlug)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data as ProvisionRun;
}

export async function updateProvisionRun(
  projectSlug: string,
  patch: Partial<ProvisionRun>
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('provision_runs')
    .update(patch)
    .eq('project_slug', projectSlug);

  if (error) throw error;
}

export async function deleteProvisionRunBySlug(projectSlug: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('provision_runs')
    .delete()
    .eq('project_slug', projectSlug);

  if (error) throw error;
}
