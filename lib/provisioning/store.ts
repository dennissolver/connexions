// lib/provisioning/store.ts
// Update setServiceError to use actual column

export async function setServiceError(
  projectSlug: string,
  service: ServiceName,
  errorMsg: string
): Promise<ProvisionRun> {
  // Map service name to column name
  const columnMap: Record<ServiceName, string> = {
    'supabase': 'supabase_error',
    'github': 'github_error',
    'vercel': 'vercel_error',
    'supabase-config': 'auth_config_error',  // Maps to auth_config
    'sandra': 'sandra_error',
    'kira': 'kira_error',
    'webhooks': 'webhooks_error',
    'finalize': 'finalize_error',
  };

  const stateColumnMap: Record<ServiceName, string> = {
    'supabase': 'supabase_state',
    'github': 'github_state',
    'vercel': 'vercel_state',
    'supabase-config': 'auth_config_state',  // Maps to auth_config
    'sandra': 'sandra_state',
    'kira': 'kira_state',
    'webhooks': 'webhooks_state',
    'finalize': 'finalize_state',
  };

  const errorColumn = columnMap[service];
  const stateColumn = stateColumnMap[service];

  const { data, error } = await supabase
    .from(TABLE)
    .update({
      [stateColumn]: 'FAILED',
      [errorColumn]: errorMsg,
      updated_at: new Date().toISOString(),
    })
    .eq('project_slug', projectSlug)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to set service error: ${error.message}`);
  }

  return data as ProvisionRun;
}