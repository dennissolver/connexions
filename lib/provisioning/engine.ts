// lib/provisioning/engine.ts

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
    .maybeSingle();  // ← Changed from .single()

  if (error) throw error;

  // If no row was updated, the state already changed - fetch current state
  if (!data) {
    const current = await getProvisionRun(projectSlug);
    if (!current) throw new Error(`Provision run not found: ${projectSlug}`);
    // Log but don't fail - this is likely a race condition
    console.warn(`[${projectSlug}] State already changed from ${from}, current: ${current.state}`);
    return current;
  }

  return data as ProvisionRun;
}