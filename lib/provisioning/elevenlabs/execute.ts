// lib/provisioning/elevenlabs/execute.ts
// Creates ElevenLabs agents - idempotent

import { ProvisionContext, StepResult } from '../types';
import { createAgent, getAgent, getSandraPrompt, getKiraPrompt } from './client';

// =============================================================================
// SANDRA (Setup Agent)
// =============================================================================

export async function sandraExecute(ctx: ProvisionContext): Promise<StepResult> {
  // Already have Sandra? Skip creation (idempotent)
  if (ctx.metadata.sandra_agent_id) {
    console.log(`[sandra.execute] Agent already exists: ${ctx.metadata.sandra_agent_id}`);
    return {
      status: 'advance',
      metadata: ctx.metadata,
    };
  }

  try {
    const agent = await createAgent({
      name: `Sandra - ${ctx.companyName}`,
      systemPrompt: getSandraPrompt(ctx.companyName, ctx.platformName),
      firstMessage: `Hello! I'm Sandra, your setup consultant for ${ctx.platformName}. I'll help you design your interview agent. Let's start - what type of interviews will you be conducting?`,
      voiceId: 'EXAVITQu4vr4xnSDxMaL', // Sarah voice
    });

    console.log(`[sandra.execute] Created agent: ${agent.agent_id}`);

    return {
      status: 'advance',
      metadata: {
        sandra_agent_id: agent.agent_id,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[sandra.execute] Failed:`, msg);

    return {
      status: 'fail',
      error: `Sandra creation failed: ${msg}`,
    };
  }
}

// =============================================================================
// KIRA (Insights Agent)
// =============================================================================

export async function kiraExecute(ctx: ProvisionContext): Promise<StepResult> {
  // Already have Kira? Skip creation (idempotent)
  if (ctx.metadata.kira_agent_id) {
    console.log(`[kira.execute] Agent already exists: ${ctx.metadata.kira_agent_id}`);
    return {
      status: 'advance',
      metadata: ctx.metadata,
    };
  }

  try {
    const agent = await createAgent({
      name: `Kira - ${ctx.companyName}`,
      systemPrompt: getKiraPrompt(ctx.companyName, ctx.platformName),
      firstMessage: `Hello! I'm Kira, your insights analyst. I can help you understand patterns and themes from your interview data. What would you like to explore?`,
      voiceId: 'pNInz6obpgDQGcFmaJgB', // Adam voice
    });

    console.log(`[kira.execute] Created agent: ${agent.agent_id}`);

    return {
      status: 'advance',
      metadata: {
        kira_agent_id: agent.agent_id,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[kira.execute] Failed:`, msg);

    return {
      status: 'fail',
      error: `Kira creation failed: ${msg}`,
    };
  }
}
