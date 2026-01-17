// lib/provisioning/store.ts
// Database operations ONLY - no business logic

import { createClient } from '@supabase/supabase-js';
import {
  ProvisionRun,
  ProvisionState,
  ProvisionMetadata,
  ProvisionContext,
} from './types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TABLE = 'provision_runs';

// =============================================================================
// CREATE
// =============================================================================

export async function createProvisionRun(params: {
  projectSlug: string;
  clientId?: string;
  companyName: string;
  platformName: string;
  initialState?: ProvisionState;
  metadata?: Record<string, unknown>;
}): Promise<ProvisionRun> {
  const {
    projectSlug,
    clientId,
    companyName,
    platformName,
    initialState = 'SUPABASE_CREATING',
    metadata: additionalMetadata = {},
  } = params;

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      project_slug: projectSlug,
      client_id: clientId || null,
      state: initialState,
      metadata: {
        company_name: companyName,
        platform_name: platformName,
        ...additionalMetadata,
      },
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create provision run: ${error.message}`);
  }

  return data as ProvisionRun;
}

// =============================================================================
// READ
// =============================================================================

export async function getProvisionRunBySlug(projectSlug: string): Promise<ProvisionRun | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('project_slug', projectSlug)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(`Failed to get provision run: ${error.message}`);
  }

  return data as ProvisionRun;
}

export async function getProvisionRunById(id: string): Promise<ProvisionRun | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to get provision run: ${error.message}`);
  }

  return data as ProvisionRun;
}

export async function getActiveProvisionRuns(): Promise<ProvisionRun[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .not('state', 'in', '("COMPLETE","FAILED")')
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to get active provision runs: ${error.message}`);
  }

  return (data || []) as ProvisionRun[];
}

// =============================================================================
// UPDATE
// =============================================================================

export async function updateProvisionRun(
  projectSlug: string,
  updates: {
    state?: ProvisionState;
    metadata?: Partial<ProvisionMetadata>;
  }
): Promise<ProvisionRun> {
  // If metadata updates provided, merge with existing
  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.state) {
    updatePayload.state = updates.state;
  }

  if (updates.metadata) {
    // Fetch current to merge metadata
    const current = await getProvisionRunBySlug(projectSlug);
    if (!current) {
      throw new Error(`Provision run not found: ${projectSlug}`);
    }
    updatePayload.metadata = {
      ...current.metadata,
      ...updates.metadata,
    };
  }

  const { data, error } = await supabase
    .from(TABLE)
    .update(updatePayload)
    .eq('project_slug', projectSlug)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update provision run: ${error.message}`);
  }

  return data as ProvisionRun;
}

export async function setProvisionState(
  projectSlug: string,
  state: ProvisionState,
  metadata?: Partial<ProvisionMetadata>
): Promise<ProvisionRun> {
  return updateProvisionRun(projectSlug, { state, metadata });
}

export async function recordProvisionError(
  projectSlug: string,
  error: string
): Promise<ProvisionRun> {
  const current = await getProvisionRunBySlug(projectSlug);
  const errorCount = ((current?.metadata?.error_count as number) || 0) + 1;

  return updateProvisionRun(projectSlug, {
    metadata: {
      last_error: error,
      error_count: errorCount,
    },
  });
}

// =============================================================================
// DELETE
// =============================================================================

export async function deleteProvisionRunBySlug(projectSlug: string): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('project_slug', projectSlug);

  if (error) {
    throw new Error(`Failed to delete provision run: ${error.message}`);
  }
}

// =============================================================================
// HELPERS
// =============================================================================

export function runToContext(run: ProvisionRun): ProvisionContext {
  return {
    projectSlug: run.project_slug,
    clientId: run.client_id,
    companyName: (run.metadata.company_name as string) || '',
    platformName: (run.metadata.platform_name as string) || '',
    metadata: run.metadata,
  };
}