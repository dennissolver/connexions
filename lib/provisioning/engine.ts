// lib/provisioning/engine.ts

import { supabaseAdmin } from '@/lib/supabase/admin';
import { ProvisionState, ALLOWED_TRANSITIONS } from './states';
import { ProvisionRun, ProvisionMetadata } from './types';

export async function getProvisionRun(projectSlug: string): Promise<ProvisionRun | null> {
  const { data, error } = await supabaseAdmin
    .from('provision_runs')
    .select('*')
    .eq('project_slug', projectSlug)
    .maybeSingle();
  if (error) throw error;
  return data as ProvisionRun | null;
}

export async function createProvisionRun(projectSlug: string, platformName: string, companyName: string): Promise<ProvisionRun> {
  const existing = await getProvisionRun(projectSlug);
  if (existing) return existing;

  const { data, error } = await supabaseAdmin
    .from('provision_runs')
    .insert({
      project_slug: projectSlug,
      platform_name: platformName,
      company_name: companyName,
      state: 'INIT',
      metadata: {}
    })
    .select()
    .single();
  if (error) throw error;
  return data as ProvisionRun;
}

export async function advanceState(
  projectSlug: string,
  from: ProvisionState,
  to: ProvisionState,
  metadata?: ProvisionMetadata
): Promise<ProvisionRun> {
  if (!ALLOWED_TRANSITIONS[from]?.includes(to)) {
    throw new Error(`Invalid: ${from} → ${to}`);
  }

  const { data, error } = await supabaseAdmin
    .from('provision_runs')
    .update({
      state: to,
      metadata: metadata ?? {},
      updated_at: new Date().toISOString()
    })
    .eq('project_slug', projectSlug)
    .eq('state', from)
    .select()
    .single();
  if (error) throw error;
  return data as ProvisionRun;
}

export async function failRun(projectSlug: string, errorMessage: string): Promise<void> {
  await supabaseAdmin
    .from('provision_runs')
    .update({
      state: 'FAILED',
      last_error: errorMessage,
      updated_at: new Date().toISOString()
    })
    .eq('project_slug', projectSlug);
}

export async function deleteProvisionRun(projectSlug: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('provision_runs')
    .delete()
    .eq('project_slug', projectSlug);
  if (error) throw error;
}

export async function resetProvisionRun(projectSlug: string): Promise<ProvisionRun | null> {
  const { data, error } = await supabaseAdmin
    .from('provision_runs')
    .update({
      state: 'INIT',
      metadata: {},
      last_error: null,
      updated_at: new Date().toISOString()
    })
    .eq('project_slug', projectSlug)
    .select()
    .single();
  if (error) throw error;
  return data as ProvisionRun | null;
}