// lib/provisioning/elevenlabs/kira.execute.ts
// Creates Kira insights agent - DEPENDS ON: vercel, supabase

import { ProvisionContext, StepResult } from '../types';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

export async function kiraExecute(ctx: ProvisionContext): Promise<StepResult> {
  // Already have Kira? Skip (idempotent)
  if (ctx.metadata.kira_agent_id) {
    console.log(`[kira.execute] Already exists: ${ctx.metadata.kira_agent_id}`);
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

  const vercelUrl = ctx.metadata.vercel_url as string;

  try {
    const systemPrompt = `You are Kira, the insights analyst for ${ctx.platformName}.

Your role is to help ${ctx.companyName} analyze their interview data:
- Summarize key themes and patterns
- Identify notable quotes and insights
- Compare responses across participants
- Generate actionable recommendations

Be analytical, clear, and objective. Support conclusions with evidence.`;

    const res = await fetch('https://api.elevenlabs.io/v1/convai/agents/create', {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `Kira - ${ctx.companyName}`,
        conversation_config: {
          agent: {
            prompt: { prompt: systemPrompt },
            first_message: `Hello! I'm Kira, your insights analyst. I can help you understand patterns and themes from your interview data. What would you like to explore?`,
            language: 'en',
          },
          tts: {
            model_id: 'eleven_turbo_v2',
            voice_id: 'pNInz6obpgDQGcFmaJgB', // Adam
          },
          asr: {
            provider: 'elevenlabs',
          },
          turn: {
            mode: 'turn',
          },
          conversation: {
            max_duration_seconds: 3600,
          },
        },
        platform_settings: {
          webhook: {
            url: `${vercelUrl}/api/webhooks/elevenlabs`,
            secret: process.env.ELEVENLABS_WEBHOOK_SECRET || 'connexions-webhook-secret',
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
    console.log(`[kira.execute] Created: ${agent.agent_id}`);

    return {
      status: 'advance',
      metadata: {
        kira_agent_id: agent.agent_id,
      },
    };
  } catch (err) {
    return {
      status: 'fail',
      error: `Kira creation failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}