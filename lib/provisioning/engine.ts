// lib/provisioning/engine.ts
import { supabaseAdmin } from '@/lib/supabase/admin';
import { ProvisionState, ALLOWED_TRANSITIONS } from './states';

/* ======================================================
   READ ONLY — SAFE — NO SIDE EFFECTS
====================================================== */
export async function getProvisionRun(projectSlug: string) {
  const { data, error } = await supabaseAdmin
    .from('provision_runs')
    .select('*')
    .eq('project_slug', projectSlug)
    .maybeSingle();

  if (error) throw error;

  return data; // may be null
}

/* ======================================================
   EXPLICIT CREATION — CALLED ONCE FROM SETUP FLOW
====================================================== */
export async function createProvisionRun(projectSlug: string) {
  const existing = await getProvisionRun(projectSlug);
  if (existing) return existing;

  const { data, error } = await supabaseAdmin
    .from('provision_runs')
    .insert({
      project_slug: projectSlug,
      state: 'INIT',
      metadata: {},
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}

/* ======================================================
   STATE MACHINE — ORCHESTRATOR ONLY
====================================================== */
export async function advanceState(
  projectSlug: string,
  from: ProvisionState,
  to: ProvisionState,
  metadata?: Record<string, any>
) {
  if (!ALLOWED_TRANSITIONS[from]?.includes(to)) {
    throw new Error(`Invalid transition ${from} → ${to}`);
  }

  const { data, error } = await supabaseAdmin
    .from('provision_runs')
    .update({
      state: to,
      metadata: metadata ?? {},
      updated_at: new Date().toISOString(),
    })
    .eq('project_slug', projectSlug)
    .eq('state', from)
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error('State transition race condition');

  return data;
}

/* ======================================================
   TERMINAL FAILURE
====================================================== */
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
