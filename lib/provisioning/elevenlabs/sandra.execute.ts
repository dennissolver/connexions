// lib/provisioning/elevenlabs/sandra.execute.ts
// Creates Sandra setup agent - DEPENDS ON: vercel, supabase

import { ProvisionContext, StepResult } from '../types';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

export async function sandraExecute(ctx: ProvisionContext): Promise<StepResult> {
  // Already have Sandra? Skip (idempotent)
  if (ctx.metadata.sandra_agent_id) {
    console.log(`[sandra.execute] Already exists: ${ctx.metadata.sandra_agent_id}`);
    return { status: 'advance' };
  }

  if (!ELEVENLABS_API_KEY) {
    return {
      status: 'fail',
      error: 'ELEVENLABS_API_KEY not configured',
    };
  }

  // Dependencies are enforced by registry, but sanity check
  if (!ctx.metadata.vercel_url) {
    return { status: 'wait' };
  }

  try {
    const systemPrompt = `You are Sandra, the setup consultant for ${ctx.platformName}.

Your role is to help ${ctx.companyName} design their interview agent by understanding:
- The purpose of their interviews
- Their target participants  
- The tone and style they want
- Key questions they need answered
- Any constraints or requirements

Be professional, warm, and thorough. Ask clarifying questions.
At the end, summarize the interview configuration for confirmation.`;

    const res = await fetch('https://api.elevenlabs.io/v1/convai/agents/create', {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `Sandra - ${ctx.companyName}`,
        conversation_config: {
          agent: {
            prompt: { prompt: systemPrompt },
            first_message: `Hello! I'm Sandra, your setup consultant for ${ctx.platformName}. I'll help you design your interview agent. Let's start - what type of interviews will you be conducting?`,
            language: 'en',
          },
          tts: {
            model_id: 'eleven_turbo_v2_5',
            voice_id: 'EXAVITQu4vr4xnSDxMaL', // Sarah
          },
          stt: {
            provider: 'elevenlabs',
          },
          turn: {
            mode: 'turn_based',
          },
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return {
        status: 'fail',
        error: `ElevenLabs API error (${res.status}): ${text}`,
      };
    }

    const agent = await res.json();
    console.log(`[sandra.execute] Created: ${agent.agent_id}`);

    return {
      status: 'advance',
      metadata: {
        sandra_agent_id: agent.agent_id,
      },
    };
  } catch (err) {
    return {
      status: 'fail',
      error: `Sandra creation failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
