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
  const updatePayload: Record<string, unknown> = {
    [stateColumn]: state,
    updated_at: new Date().toISOString(),
  };

  // Merge metadata if provided
  if (metadata) {
    const current = await getProvisionRunBySlug(projectSlug);
    if (!current) {
      throw new Error(`Provision run not found: ${projectSlug}`);
    }
    updatePayload.metadata = {
      ...current.metadata,
      ...metadata,
    };
  }

  const { data, error } = await supabase
    .from(TABLE)
    .update(updatePayload)
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
// UPDATE METADATA
// =============================================================================

export async function updateMetadata(
  projectSlug: string,
  metadata: Partial<ProvisionMetadata>
): Promise<ProvisionRun> {
  const current = await getProvisionRunBySlug(projectSlug);
  if (!current) {
    throw new Error(`Provision run not found: ${projectSlug}`);
  }

  const { data, error } = await supabase
    .from(TABLE)
    .update({
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
    throw new Error(`Failed to update metadata: ${error.message}`);
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
