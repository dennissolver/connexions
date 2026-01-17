import { supabaseAdmin } from '@/lib/supabase/admin';
import { ProvisionContext } from '../types';

export async function deleteProvisionedPlatform(ctx: ProvisionContext) {
  const slug = ctx.projectSlug;

  await supabaseAdmin.from('provision_runs').delete().eq('project_slug', slug);
  await supabaseAdmin.from('agent_registry').delete().eq('project_slug', slug);
}
