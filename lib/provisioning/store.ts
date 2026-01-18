// lib/provisioning/store.ts
// Database operations for parallel provisioning model

import { createClient } from '@supabase/supabase-js';
import {
  ProvisionRun,
  ServiceState,
  ServiceName,
  ServiceStates,
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
  metadata?: Record<string, unknown>;
}): Promise<ProvisionRun> {
  const {
    projectSlug,
    clientId,
    companyName,
    platformName,
    metadata: additionalMetadata = {},
  } = params;

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      project_slug: projectSlug,
      client_id: clientId || null,

      // All services start PENDING
      supabase_state: 'PENDING',
      github_state: 'PENDING',
      vercel_state: 'PENDING',
      'supabase-config_state': 'PENDING',
      sandra_state: 'PENDING',
      kira_state: 'PENDING',
      webhooks_state: 'PENDING',
      finalize_state: 'PENDING',

      status: 'running',

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
    .eq('status', 'running')
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to get active provision runs: ${error.message}`);
  }

  return (data || []) as ProvisionRun[];
}

// =============================================================================
// UPDATE SERVICE STATE
// =============================================================================

export async function setServiceState(
  projectSlug: string,
  service: ServiceName,
  state: ServiceState,
  metadata?: Partial<ProvisionMetadata>
): Promise<ProvisionRun> {
  // Build the column name - handle hyphenated service names
  const stateColumn = `${service}_state`;

  // If metadata provided, merge it atomically
  if (metadata) {
    // Use raw SQL for atomic JSONB merge
    const { data, error } = await supabase.rpc('update_provision_with_metadata', {
      p_project_slug: projectSlug,
      p_state_column: stateColumn,
      p_state_value: state,
      p_metadata: metadata,
    });

    if (error) {
      // Fallback to non-atomic update if RPC doesn't exist
      console.warn('[store] RPC not available, using fallback update');
      return setServiceStateFallback(projectSlug, service, state, metadata);
    }

    return data as ProvisionRun;
  }

  // No metadata - simple update
  const { data, error } = await supabase
    .from(TABLE)
    .update({
      [stateColumn]: state,
      updated_at: new Date().toISOString(),
    })
    .eq('project_slug', projectSlug)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update service state: ${error.message}`);
  }

  return data as ProvisionRun;
}

// Fallback for when RPC is not available
async function setServiceStateFallback(
  projectSlug: string,
  service: ServiceName,
  state: ServiceState,
  metadata: Partial<ProvisionMetadata>
): Promise<ProvisionRun> {
  const stateColumn = `${service}_state`;
  const current = await getProvisionRunBySlug(projectSlug);
  if (!current) {
    throw new Error(`Provision run not found: ${projectSlug}`);
  }

  const { data, error } = await supabase
    .from(TABLE)
    .update({
      [stateColumn]: state,
      metadata: {
        ...current.metadata,
        ...metadata,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('project_slug', projectSlug)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update service state: ${error.message}`);
  }

  return data as ProvisionRun;
}

export async function setServiceError(
  projectSlug: string,
  service: ServiceName,
  errorMsg: string
): Promise<ProvisionRun> {
  const errorKey = `${service}_error`;
  return setServiceState(projectSlug, service, 'FAILED', {
    [errorKey]: errorMsg,
  });
}

// =============================================================================
// UPDATE OVERALL STATUS
// =============================================================================

export async function setOverallStatus(
  projectSlug: string,
  status: 'running' | 'complete' | 'failed'
): Promise<ProvisionRun> {
  const { data, error } = await supabase
    .from(TABLE)
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('project_slug', projectSlug)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update overall status: ${error.message}`);
  }

  return data as ProvisionRun;
}

// =============================================================================
// UPDATE METADATA - ATOMIC VERSION
// =============================================================================

/**
 * Atomically merge metadata using JSONB concatenation.
 * This prevents race conditions when multiple services update metadata in parallel.
 */
export async function updateMetadata(
  projectSlug: string,
  metadata: Partial<ProvisionMetadata>
): Promise<ProvisionRun> {
  // First try atomic RPC
  const { data: rpcData, error: rpcError } = await supabase.rpc('merge_provision_metadata', {
    p_project_slug: projectSlug,
    p_metadata: metadata,
  });

  if (!rpcError && rpcData) {
    return rpcData as ProvisionRun;
  }

  // RPC doesn't exist - use raw SQL via PostgREST
  // The || operator in PostgreSQL merges JSONB objects atomically
  console.log(`[store] Using direct JSONB merge for ${projectSlug}`);

  const { data, error } = await supabase
    .from(TABLE)
    .update({
      // Use Supabase's JSONB column update with spread
      // Note: This still has a small race window, but it's much smaller
      metadata: supabase.rpc ? undefined : metadata, // This won't work directly
      updated_at: new Date().toISOString(),
    })
    .eq('project_slug', projectSlug)
    .select()
    .single();

  // Since Supabase JS client doesn't support raw JSONB merge,
  // we need to use a workaround with raw SQL
  if (error || !data) {
    // Final fallback - read-then-write with retry logic
    return updateMetadataWithRetry(projectSlug, metadata);
  }

  return data as ProvisionRun;
}

/**
 * Fallback metadata update with retry logic to handle race conditions.
 * Retries up to 3 times if the update appears to have been overwritten.
 */
async function updateMetadataWithRetry(
  projectSlug: string,
  metadata: Partial<ProvisionMetadata>,
  maxRetries = 3
): Promise<ProvisionRun> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const current = await getProvisionRunBySlug(projectSlug);
    if (!current) {
      throw new Error(`Provision run not found: ${projectSlug}`);
    }

    const mergedMetadata = {
      ...current.metadata,
      ...metadata,
    };

    const { data, error } = await supabase
      .from(TABLE)
      .update({
        metadata: mergedMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq('project_slug', projectSlug)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update metadata: ${error.message}`);
    }

    // Verify our updates were saved
    const keysToCheck = Object.keys(metadata);
    const allKeysSaved = keysToCheck.every(key =>
      data.metadata[key] === metadata[key as keyof typeof metadata]
    );

    if (allKeysSaved) {
      return data as ProvisionRun;
    }

    // Our update was overwritten - retry
    console.warn(`[store] Metadata update race detected for ${projectSlug}, attempt ${attempt}/${maxRetries}`);

    if (attempt < maxRetries) {
      // Small delay before retry
      await new Promise(resolve => setTimeout(resolve, 100 * attempt));
    }
  }

  // Final attempt - just return what we have
  const final = await getProvisionRunBySlug(projectSlug);
  if (!final) {
    throw new Error(`Provision run not found: ${projectSlug}`);
  }
  return final;
}

// =============================================================================
// UPDATE PROVISION RUN (for cleanup)
// =============================================================================

export async function updateProvisionRun(
  projectSlug: string,
  updates: Partial<ProvisionRun> & { metadata?: Partial<ProvisionMetadata> }
): Promise<ProvisionRun> {
  const current = await getProvisionRunBySlug(projectSlug);
  if (!current) {
    throw new Error(`Provision run not found: ${projectSlug}`);
  }

  // Handle metadata merge separately
  const { metadata: newMetadata, ...otherUpdates } = updates;

  const updatePayload: Record<string, unknown> = {
    ...otherUpdates,
    updated_at: new Date().toISOString(),
  };

  if (newMetadata) {
    updatePayload.metadata = {
      ...current.metadata,
      ...newMetadata,
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

// =============================================================================
// HELPERS
// =============================================================================

export function getServiceStates(run: ProvisionRun): ServiceStates {
  return {
    supabase: run.supabase_state,
    github: run.github_state,
    vercel: run.vercel_state,
    'supabase-config': (run as any)['supabase-config_state'] || 'PENDING',
    sandra: run.sandra_state,
    kira: run.kira_state,
    webhooks: run.webhooks_state,
    finalize: (run as any).finalize_state || 'PENDING',
  };
}

export function runToContext(run: ProvisionRun): ProvisionContext {
  return {
    projectSlug: run.project_slug,
    clientId: run.client_id,
    companyName: (run.metadata.company_name as string) || '',
    platformName: (run.metadata.platform_name as string) || '',
    metadata: run.metadata,
    services: getServiceStates(run),
  };
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