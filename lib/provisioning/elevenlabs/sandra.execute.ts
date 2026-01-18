// lib/provisioning/elevenlabs/sandra.execute.ts
// Creates Sandra setup agent - DEPENDS ON: vercel, supabase

import { ProvisionContext, StepResult } from '../types';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const CONNEXIONS_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://connexions.vercel.app';

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

Be professional, warm, and thorough. Ask clarifying questions to gather all the details you need.

IMPORTANT - When you have collected all the information:
1. Give a brief recap of what you heard (panel name, research goal, key questions, tone, interviewer name, etc.)
2. Ask the client to confirm you got everything right
3. Once confirmed, save the draft using your tool
4. After saving, say something like: "Perfect! I've prepared the draft for your review. Please click the Draft Review button on your screen and end this call. You'll be able to review and edit everything before creating your interview panel."

Do NOT list out technical details like "I will now call the save tool" or explain the system components. Keep the wrap-up natural and client-focused.`;

    // First create the agent to get the agent_id
    const createRes = await fetch('https://api.elevenlabs.io/v1/convai/agents/create', {
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
            model_id: 'eleven_turbo_v2',
            voice_id: 'EXAVITQu4vr4xnSDxMaL', // Sarah
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
      }),
    });

    if (!createRes.ok) {
      const text = await createRes.text();
      return {
        status: 'fail',
        error: `ElevenLabs API error (${createRes.status}): ${text}`,
      };
    }

    const agent = await createRes.json();
    const agentId = agent.agent_id;
    console.log(`[sandra.execute] Created agent: ${agentId}`);

    // Now update the agent with tools that include the agent_id in the webhook URL
    // This ensures Connexions router can identify which child platform to forward to
    const updateRes = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
      method: 'PATCH',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tools: [
          {
            type: 'webhook',
            name: 'save_panel_draft',
            description: 'Save the interview panel configuration as a draft. The user will see it on screen where they can review and edit before creating. Call this when the user has confirmed all details.',
            webhook: {
              // Route through Connexions for central logging and evals
              url: `${CONNEXIONS_URL}/api/tools/save-draft-router?agent_id=${agentId}&project_slug=${ctx.projectSlug}`,
              method: 'POST',
              headers: {
                'X-Shared-Secret': process.env.TOOL_SHARED_SECRET || 'universal-interviews-tool-secret',
              },
            },
            parameters: {
              type: 'object',
              description: 'Extract the interview panel configuration from the conversation. Collect the panel name, research description, list of questions, interviewer tone, target audience, duration in minutes, the AI interviewer name, voice gender (male or female), closing message, and optional greeting.',
              properties: {
                name: {
                  type: 'string',
                  description: 'Name of the interview panel or study',
                },
                description: {
                  type: 'string',
                  description: 'Research objective and what insight we are seeking',
                },
                questions: {
                  type: 'array',
                  description: 'List of interview questions as an array of strings',
                  items: {
                    type: 'string',
                    description: 'A single interview question',
                  },
                },
                tone: {
                  type: 'string',
                  description: 'Interview tone such as Friendly and Professional or Casual or Academic',
                },
                target_audience: {
                  type: 'string',
                  description: 'Description of who will be interviewed including role and experience',
                },
                duration_minutes: {
                  type: 'number',
                  description: 'Expected interview length in minutes',
                },
                agent_name: {
                  type: 'string',
                  description: 'Name for the AI interviewer such as Rachel or Alex or Jordan',
                },
                voice_gender: {
                  type: 'string',
                  description: 'Voice gender for the AI interviewer',
                  enum: ['male', 'female'],
                },
                closing_message: {
                  type: 'string',
                  description: 'Thank you message to say at the end of the interview',
                },
                greeting: {
                  type: 'string',
                  description: 'Optional custom opening line for the interviewer',
                },
              },
              required: ['name', 'description', 'questions', 'tone', 'target_audience', 'duration_minutes', 'agent_name', 'voice_gender', 'closing_message'],
            },
          },
        ],
      }),
    });

    if (!updateRes.ok) {
      const text = await updateRes.text();
      console.warn(`[sandra.execute] Failed to add tools: ${text}`);
      // Don't fail - agent is created, tools can be added manually
    } else {
      console.log(`[sandra.execute] Added tools with Connexions router webhook`);
    }

    return {
      status: 'advance',
      metadata: {
        sandra_agent_id: agentId,
      },
    };
  } catch (err) {
    return {
      status: 'fail',
      error: `Sandra creation failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}