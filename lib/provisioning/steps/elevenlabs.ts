import { ProvisionContext, ProvisionStepResult } from '../types';

export async function createSandraAgent(
  ctx: ProvisionContext
): Promise<ProvisionStepResult> {
  // real ElevenLabs / Sandra creation logic here

  return {
    nextState: 'SANDRA_READY',
    metadata: {
      sandraAgentId: 'agent_sandra_xxx',
      sandraVerified: true,
    },
  };
}

export async function createKiraAgent(
  ctx: ProvisionContext
): Promise<ProvisionStepResult> {
  // real ElevenLabs / Kira creation logic here

  return {
    nextState: 'KIRA_READY',
    metadata: {
      kiraAgentId: 'agent_kira_xxx',
      kiraVerified: true,
    },
  };
}
