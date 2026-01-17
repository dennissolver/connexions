import { supabaseAdmin } from '@/lib/supabase/admin';
import { ProvisionState } from './states';

export interface ProvisionRun {
  project_slug: string;
  state: ProvisionState;
  metadata?: Record<string, any>;
}

export async function createProvisionRun(
  projectSlug: string,
  initialState: ProvisionState = 'SUPABASE_CREATING'
): Promise<ProvisionRun> {
  const { data, error } = await supabaseAdmin
    .from('provision_runs')
    .insert({
      project_slug: projectSlug,
      state: initialState,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateProvisionRun(
  projectSlug: string,
  state: ProvisionState,
  metadata?: Record<string, any>
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('provision_runs')
    .update({
      state,
      metadata,
    })
    .eq('project_slug', projectSlug);

  if (error) throw error;
}

export async function getProvisionRunBySlug(
  projectSlug: string
): Promise<ProvisionRun | null> {
  const { data, error } = await supabaseAdmin
    .from('provision_runs')
    .select('*')
    .eq('project_slug', projectSlug)
    .single();

  if (error) return null;
  return data;
}

export async function deleteProvisionRunBySlug(
  projectSlug: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('provision_runs')
    .delete()
    .eq('project_slug', projectSlug);

  if (error) throw error;
}
