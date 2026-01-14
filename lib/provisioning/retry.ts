// lib/provisioning/retry.ts
import { supabaseAdmin } from '@/lib/supabase/admin';

const MAX_RETRIES = 5;

export async function shouldRetryProvisioning(
  projectSlug: string
): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('provision_runs')
    .select('metadata')
    .eq('project_slug', projectSlug)
    .single();

  const retryCount = data?.metadata?.retryCount ?? 0;
  return retryCount < MAX_RETRIES;
}

export async function recordRetry(
  projectSlug: string
): Promise<void> {
  const { data } = await supabaseAdmin
    .from('provision_runs')
    .select('metadata')
    .eq('project_slug', projectSlug)
    .single();

  const retryCount = (data?.metadata?.retryCount ?? 0) + 1;

  await supabaseAdmin
    .from('provision_runs')
    .update({
      metadata: {
        ...(data?.metadata ?? {}),
        retryCount,
        lastRetryAt: new Date().toISOString(),
      },
    })
    .eq('project_slug', projectSlug);
}

