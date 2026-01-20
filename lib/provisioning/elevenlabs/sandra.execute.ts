// lib/provisioning/elevenlabs/sandra.execute.ts
// Creates Sandra setup agent using new tool_ids approach
// DEPENDS ON: vercel, supabase

import { ProvisionContext, StepResult } from '../types';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const CONNEXIONS_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://connexions-silk.vercel.app';

// ============================================================================
// SANDRA'S TOOL CONFIG - NEW ELEVENLABS FORMAT (tool_ids approach)
// ============================================================================

function getSandraToolConfig(webhookUrl: string) {
  return {
    type: 'webhook',
    name: 'save_panel_draft',
    description: 'Save the interview panel configuration as a draft. The user will see it on screen where they can review and edit before creating. Call this when the user has confirmed all details.',
    params: {
      method: 'POST',
      url: webhookUrl,
      request_body_schema: {
        type: 'object',
        description: 'Interview panel configuration to save as draft',
        properties: {
          name: {
            type: 'string',
            description: 'Name of the interview panel or study',
            value_type: 'llm_prompt',
            required: true,
          },
          description: {
            type: 'string',
            description: 'Research objective and what insight we are seeking',
            value_type: 'llm_prompt',
            required: true,
          },
          questions: {
            type: 'array',
            description: 'List of interview questions',
            value_type: 'llm_prompt',
            required: true,
          },
          tone: {
            type: 'string',
            description: 'Interview tone such as Friendly and Professional or Casual or Academic',
            value_type: 'llm_prompt',
            required: true,
          },
          target_audience: {
            type: 'string',
            description: 'Description of who will be interviewed including role and experience',
            value_type: 'llm_prompt',
            required: true,
          },
          duration_minutes: {
            type: 'number',
            description: 'Expected interview length in minutes',
            value_type: 'llm_prompt',
            required: true,
          },
          agent_name: {
            type: 'string',
            description: 'Name for the AI interviewer such as Rachel or Alex or Jordan',
            value_type: 'llm_prompt',
            required: true,
          },
          voice_gender: {
            type: 'string',
            description: 'Voice gender for the AI interviewer - must be male or female',
            value_type: 'llm_prompt',
            required: true,
          },
          closing_message: {
            type: 'string',
            description: 'Thank you message to say at the end of the interview',
            value_type: 'llm_prompt',
            required: true,
          },
          greeting: {
            type: 'string',
            description: 'Optional custom opening line for the interviewer',
            value_type: 'llm_prompt',
            required: false,
          },
        },
        required: ['name', 'description', 'questions', 'tone', 'target_audience', 'duration_minutes', 'agent_name', 'voice_gender', 'closing_message'],
      },
    },
  };
}

// ============================================================================
// MAIN EXECUTE FUNCTION
// ============================================================================

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
    const webhookUrl = `${CONNEXIONS_URL}/api/tools/save-draft-router?project_slug=${ctx.projectSlug}`;

    // =========================================================================
    // STEP 1: Create tool in the workspace first (new approach)
    // =========================================================================
    const toolConfig = getSandraToolConfig(webhookUrl);
    let toolId: string | null = null;

    console.log(`[sandra.execute] Creating save_panel_draft tool in workspace...`);

    try {
      const toolRes = await fetch('https://api.elevenlabs.io/v1/convai/tools', {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tool_config: toolConfig }),
      });

      if (toolRes.ok) {
        const toolData = await toolRes.json();
        toolId = toolData.id;
        console.log(`[sandra.execute] Created tool: save_panel_draft -> ${toolId}`);
      } else {
        const errText = await toolRes.text();
        console.warn(`[sandra.execute] Failed to create tool: ${errText}`);
      }
    } catch (toolErr) {
      console.warn(`[sandra.execute] Error creating tool:`, toolErr);
    }

    // =========================================================================
    // STEP 2: Create agent with tool_ids (new approach)
    // =========================================================================
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
3. Once confirmed, save the draft using your save_panel_draft tool
4. After saving, say something like: "Perfect! I've prepared the draft for your review. Please click the Draft Review button on your screen and end this call. You'll be able to review and edit everything before creating your interview panel."

Do NOT list out technical details like "I will now call the save tool" or explain the system components. Keep the wrap-up natural and client-focused.`;

    const agentConfig: any = {
      name: `Sandra - ${ctx.companyName}`,
      conversation_config: {
        agent: {
          prompt: {
            prompt: systemPrompt,
            // Only include tool_ids if we successfully created a tool
            ...(toolId ? { tool_ids: [toolId] } : {}),
          },
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
    };

    const createRes = await fetch('https://api.elevenlabs.io/v1/convai/agents/create', {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(agentConfig),
    });

    if (!createRes.ok) {
      const text = await createRes.text();
      console.error('[sandra.execute] Create failed:', text);
      return {
        status: 'fail',
        error: `ElevenLabs API error (${createRes.status}): ${text}`,
      };
    }

    const agent = await createRes.json();
    const agentId = agent.agent_id;

    console.log(`[sandra.execute] Created Sandra agent: ${agentId}${toolId ? ` with tool ${toolId}` : ' (no tool)'}`);

    return {
      status: 'advance',
      metadata: {
        sandra_agent_id: agentId,
        sandra_tool_id: toolId ?? undefined,
      },
    };
  } catch (err) {
    return {
      status: 'fail',
      error: `Sandra creation failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
