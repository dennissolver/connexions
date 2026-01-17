// lib/provisioning/elevenlabs/sandra.verify.ts
// Verifies Sandra agent exists and is retrievable

import { ProvisionContext, StepResult } from '../types';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

export async function sandraVerify(ctx: ProvisionContext): Promise<StepResult> {
  const agentId = ctx.metadata.sandra_agent_id as string;

  if (!agentId) {
    return {
      status: 'fail',
      error: 'No sandra_agent_id in metadata',
    };
  }

  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY!,
      },
    });

    if (!res.ok) {
      console.log(`[sandra.verify] Agent not ready: ${res.status}`);
      return { status: 'wait' };
    }

    const agent = await res.json();

    if (!agent.agent_id) {
      console.log(`[sandra.verify] Agent response invalid`);
      return { status: 'wait' };
    }

    console.log(`[sandra.verify] Verified: ${agentId}`);

    return {
      status: 'advance',
    };
  } catch (err) {
    console.log(`[sandra.verify] Error, will retry: ${err}`);
    return { status: 'wait' };
  }
}
