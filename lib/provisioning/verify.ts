import { supabaseAdmin } from '@/lib/supabase/admin';
import { ProvisionContext } from './types';

export async function verifySandra(ctx: ProvisionContext): Promise<boolean> {
  const agentId = ctx.metadata?.sandraAgentId;
  if (!agentId) return false;

  const { data, error } = await supabaseAdmin
    .from('agent_registry')
    .select('id')
    .eq('agent_id', agentId)
    .single();

  return !!data && !error;
}

export async function verifyKira(ctx: ProvisionContext): Promise<boolean> {
  const agentId = ctx.metadata?.kiraAgentId;
  if (!agentId) return false;

  const { data, error } = await supabaseAdmin
    .from('agent_registry')
    .select('id')
    .eq('agent_id', agentId)
    .single();

  return !!data && !error;
}
