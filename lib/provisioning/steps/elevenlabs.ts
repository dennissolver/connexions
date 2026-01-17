
import { ProvisionContext, ProvisionStepResult } from '../types';

export async function createSandraAgent(ctx: ProvisionContext): Promise<ProvisionStepResult> {
  const agentId = ctx.metadata?.sandraAgentId;

  return {
    nextState: 'SANDRA_VERIFYING',
    metadata: {
      ...ctx.metadata,
      sandraAgentId: agentId,
    },
  };
}

export async function createKiraAgent(ctx: ProvisionContext): Promise<ProvisionStepResult> {
  const agentId = ctx.metadata?.kiraAgentId;

  return {
    nextState: 'KIRA_VERIFYING',
    metadata: {
      ...ctx.metadata,
      kiraAgentId: agentId,
    },
  };
}
