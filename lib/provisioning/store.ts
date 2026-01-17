import { supabase } from '@/lib/supabase';

export async function getRun(projectSlug: string) {
  const { data } = await supabase
    .from('provision_runs')
    .select('*')
    .eq('project_slug', projectSlug)
    .single();
  return data;
}

export async function updateRun(projectSlug: string, patch: any) {
  await supabase
    .from('provision_runs')
    .update(patch)
    .eq('project_slug', projectSlug);
}
