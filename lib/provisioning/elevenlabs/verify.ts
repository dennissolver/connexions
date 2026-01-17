// lib/provisioning/elevenlabs/verify.ts
// Verifies ElevenLabs agents exist and respond

import { ProvisionContext, StepResult } from '../types';
import { testAgent } from './client';

// =============================================================================
// SANDRA (Setup Agent)
// =============================================================================

export async function sandraVerify(ctx: ProvisionContext): Promise<StepResult> {
  const agentId = ctx.metadata.sandra_agent_id;

  if (!agentId) {
    return {
      status: 'fail',
      error: 'No Sandra agent ID in metadata',
    };
  }

  try {
    const ready = await testAgent(agentId as string);

    if (!ready) {
      console.log(`[sandra.verify] Agent ${agentId} not ready`);
      return {
        status: 'wait',
      };
    }

    console.log(`[sandra.verify] Agent ${agentId} verified`);

    return {
      status: 'advance',
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[sandra.verify] Error:`, msg);

    return {
      status: 'wait',
    };
  }
}

// =============================================================================
// KIRA (Insights Agent)
// =============================================================================

export async function kiraVerify(ctx: ProvisionContext): Promise<StepResult> {
  const agentId = ctx.metadata.kira_agent_id;

  if (!agentId) {
    return {
      status: 'fail',
      error: 'No Kira agent ID in metadata',
    };
  }

  try {
    const ready = await testAgent(agentId as string);

    if (!ready) {
      console.log(`[kira.verify] Agent ${agentId} not ready`);
      return {
        status: 'wait',
      };
    }

    console.log(`[kira.verify] Agent ${agentId} verified`);

    return {
      status: 'advance',
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[kira.verify] Error:`, msg);

    return {
      status: 'wait',
    };
  }
}
