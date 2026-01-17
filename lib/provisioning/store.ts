// lib/provisioning/store.ts

import { supabaseAdmin } from '@/lib/supabase/admin';
import { ProvisionState } from './states';

export interface CreateProvisionRunInput {
  projectSlug: string;
  initialState: ProvisionState;
  setupPayload: Record<string, any>;
}

export async function createProvisionRun({
  projectSlug,
  initialState,
  setupPayload,
}: CreateProvisionRunInput) {
  const { data, error } = await supabaseAdmin
    .from('provision_runs')
    .insert({
      project_slug: projectSlug,
      state: initialState,
      setup_payload: setupPayload,
      metadata: {},
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getProvisionRunBySlug(projectSlug: string) {
  const { data, error } = await supabaseAdmin
    .from('provision_runs')
    .select('*')
    .eq('project_slug', projectSlug)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  return data ?? null;
}

export async function updateProvisionRun(
  projectSlug: string,
  updates: {
    state?: ProvisionState;
    metadata?: Record<string, any>;
    last_error?: string;
  }
) {
  const { error } = await supabaseAdmin
    .from('provision_runs')
    .update(updates)
    .eq('project_slug', projectSlug);

  if (error) throw error;
}
