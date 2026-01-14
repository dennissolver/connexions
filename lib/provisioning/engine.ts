// lib/provisioning/engine.ts
import { supabaseAdmin } from '@/lib/supabase/admin';
import { ProvisionState, ALLOWED_TRANSITIONS } from './states';

export async function getProvisionRun(projectSlug: string) {
  const { data, error } = await supabaseAdmin
    .from('provision_runs')
    .select('*')
    .eq('project_slug', projectSlug)
    .single();

  if (data) return data;

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  const { data: created, error: insertError } = await supabaseAdmin
    .from('provision_runs')
    .insert({
      project_slug: projectSlug,
      state: 'INIT',
      metadata: {},
    })
    .select()
    .single();

  if (insertError) throw insertError;

  return created;
}

export async function advanceState(
  projectSlug: string,
  from: ProvisionState,
  to: ProvisionState,
  metadata?: Record<string, any>
) {
  if (!ALLOWED_TRANSITIONS[from]?.includes(to)) {
    throw new Error(`Invalid transition ${from} â†’ ${to}`);
  }

  const { error } = await supabaseAdmin
    .from('provision_runs')
    .update({
      state: to,
      metadata: metadata ?? {},
      updated_at: new Date().toISOString(),
    })
    .eq('project_slug', projectSlug)
    .eq('state', from);

  if (error) throw error;
}

export async function failRun(
  projectSlug: string,
  errorMessage: string
) {
  const { error } = await supabaseAdmin
    .from('provision_runs')
    .update({
      state: 'FAILED',
      error: errorMessage,
      updated_at: new Date().toISOString(),
    })
    .eq('project_slug', projectSlug);

  if (error) throw error;
}

