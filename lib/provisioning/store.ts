import { supabaseAdmin } from '@/lib/supabase/admin';
import { ProvisionState } from './states';

export interface ProvisionRunRow {
  project_slug: string;
  state: ProvisionState;
  metadata: Record<string, any> | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

/* -------------------------------------------------------------------------- */
/* CREATE                                                                      */
/* -------------------------------------------------------------------------- */

export async function createProvisionRun(params: {
  projectSlug: string;
  initialState: ProvisionState;
  metadata?: Record<string, any>;
}) {
  const { projectSlug, initialState, metadata = {} } = params;

  const { error } = await supabaseAdmin
    .from('provision_runs')
    .insert({
      project_slug: projectSlug,
      state: initialState,
      metadata,
    });

  if (error) {
    throw new Error(`Failed to create provision run: ${error.message}`);
  }
}

/* -------------------------------------------------------------------------- */
/* READ                                                                        */
/* -------------------------------------------------------------------------- */

export async function getProvisionRunBySlug(
  projectSlug: string
): Promise<ProvisionRunRow | null> {
  const { data, error } = await supabaseAdmin
    .from('provision_runs')
    .select('*')
    .eq('project_slug', projectSlug)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // not found
    }
    throw new Error(`Failed to fetch provision run: ${error.message}`);
  }

  return data as ProvisionRunRow;
}

/* -------------------------------------------------------------------------- */
/* UPDATE                                                                      */
/* -------------------------------------------------------------------------- */

export async function updateProvisionRun(
  projectSlug: string,
  patch: {
    state?: ProvisionState;
    metadata?: Record<string, any>;
    last_error?: string | null;
  }
) {
  const { error } = await supabaseAdmin
    .from('provision_runs')
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq('project_slug', projectSlug);

  if (error) {
    throw new Error(`Failed to update provision run: ${error.message}`);
  }
}

/* -------------------------------------------------------------------------- */
/* DELETE                                                                      */
/* -------------------------------------------------------------------------- */

export async function deleteProvisionRunBySlug(projectSlug: string) {
  const { error } = await supabaseAdmin
    .from('provision_runs')
    .delete()
    .eq('project_slug', projectSlug);

  if (error) {
    throw new Error(`Failed to delete provision run: ${error.message}`);
  }
}
