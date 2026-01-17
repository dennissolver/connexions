// lib/provisioning/elevenlabs/kira.verify.ts
// Verifies Kira agent exists and is retrievable

import { ProvisionContext, StepResult } from '../types';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

export async function kiraVerify(ctx: ProvisionContext): Promise<StepResult> {
  const agentId = ctx.metadata.kira_agent_id as string;

  if (!agentId) {
    return {
      status: 'fail',
      error: 'No kira_agent_id in metadata',
    };
  }

  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY!,
      },
    });

    if (!res.ok) {
      console.log(`[kira.verify] Agent not ready: ${res.status}`);
      return { status: 'wait' };
    }

    const agent = await res.json();

    if (!agent.agent_id) {
      console.log(`[kira.verify] Agent response invalid`);
      return { status: 'wait' };
    }

    console.log(`[kira.verify] Verified: ${agentId}`);

    return {
      status: 'advance',
    };
  } catch (err) {
    console.log(`[kira.verify] Error, will retry: ${err}`);
    return { status: 'wait' };
  }
}
