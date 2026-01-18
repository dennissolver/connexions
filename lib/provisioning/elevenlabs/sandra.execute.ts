// lib/provisioning/elevenlabs/sandra.execute.ts
// Creates Sandra setup agent - DEPENDS ON: vercel, supabase

import { ProvisionContext, StepResult } from '../types';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const CONNEXIONS_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://connexions-silk.vercel.app';

// ============================================================================
// SANDRA'S TOOL DEFINITION - CORRECT ELEVENLABS FORMAT
// ============================================================================

function getSandraTool(webhookUrl: string) {
  return {
    type: 'webhook',
    name: 'save_panel_draft',
    description: 'Save the interview panel configuration as a draft. The user will see it on screen where they can review and edit before creating. Call this when the user has confirmed all details.',
    disable_interruptions: false,
    force_pre_tool_speech: 'auto',
    assignments: [],
    tool_call_sound: null,
    tool_call_sound_behavior: 'auto',
    execution_mode: 'immediate',
    api_schema: {
      url: webhookUrl,
      method: 'POST',
      path_params_schema: [],
      query_params_schema: [],
      request_body_schema: {
        id: 'body',
        type: 'object',
        description: 'Interview panel configuration to save as draft',
        properties: [
          {
            id: 'name',
            type: 'string',
            value_type: 'llm_prompt',
            description: 'Name of the interview panel or study',
            dynamic_variable: '',
            constant_value: '',
            enum: null,
            is_system_provided: false,
            required: true,
            properties: [],
          },
          {
            id: 'description',
            type: 'string',
            value_type: 'llm_prompt',
            description: 'Research objective and what insight we are seeking',
            dynamic_variable: '',
            constant_value: '',
            enum: null,
            is_system_provided: false,
            required: true,
            properties: [],
          },
          {
            id: 'questions',
            type: 'array',
            value_type: 'llm_prompt',
            description: 'List of interview questions',
            dynamic_variable: '',
            constant_value: '',
            enum: null,
            is_system_provided: false,
            required: true,
            properties: [],
          },
          {
            id: 'tone',
            type: 'string',
            value_type: 'llm_prompt',
            description: 'Interview tone such as Friendly and Professional or Casual or Academic',
            dynamic_variable: '',
            constant_value: '',
            enum: null,
            is_system_provided: false,
            required: true,
            properties: [],
          },
          {
            id: 'target_audience',
            type: 'string',
            value_type: 'llm_prompt',
            description: 'Description of who will be interviewed including role and experience',
            dynamic_variable: '',
            constant_value: '',
            enum: null,
            is_system_provided: false,
            required: true,
            properties: [],
          },
          {
            id: 'duration_minutes',
            type: 'number',
            value_type: 'llm_prompt',
            description: 'Expected interview length in minutes',
            dynamic_variable: '',
            constant_value: '',
            enum: null,
            is_system_provided: false,
            required: true,
            properties: [],
          },
          {
            id: 'agent_name',
            type: 'string',
            value_type: 'llm_prompt',
            description: 'Name for the AI interviewer such as Rachel or Alex or Jordan',
            dynamic_variable: '',
            constant_value: '',
            enum: null,
            is_system_provided: false,
            required: true,
            properties: [],
          },
          {
            id: 'voice_gender',
            type: 'string',
            value_type: 'llm_prompt',
            description: 'Voice gender for the AI interviewer - must be male or female',
            dynamic_variable: '',
            constant_value: '',
            enum: null,
            is_system_provided: false,
            required: true,
            properties: [],
          },
          {
            id: 'closing_message',
            type: 'string',
            value_type: 'llm_prompt',
            description: 'Thank you message to say at the end of the interview',
            dynamic_variable: '',
            constant_value: '',
            enum: null,
            is_system_provided: false,
            required: true,
            properties: [],
          },
          {
            id: 'greeting',
            type: 'string',
            value_type: 'llm_prompt',
            description: 'Optional custom opening line for the interviewer',
            dynamic_variable: '',
            constant_value: '',
            enum: null,
            is_system_provided: false,
            required: false,
            properties: [],
          },
        ],
        required: false,
        value_type: 'llm_prompt',
      },
      request_headers: [],
      auth_connection: null,
    },
    response_timeout_secs: 20,
    dynamic_variables: { dynamic_variable_placeholders: {} },
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

    // Create agent first without tools
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
      console.error('[sandra.execute] Create failed:', text);
      return {
        status: 'fail',
        error: `ElevenLabs API error (${createRes.status}): ${text}`,
      };
    }

    const agent = await createRes.json();
    const agentId = agent.agent_id;

    console.log(`[sandra.execute] Created agent: ${agentId}, now adding tool...`);

    // Add the save_panel_draft tool
    const tool = getSandraTool(webhookUrl);

    const toolRes = await fetch(
      `https://api.elevenlabs.io/v1/convai/agents/${agentId}/add-tool`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tool),
      }
    );

    if (!toolRes.ok) {
      const errText = await toolRes.text();
      console.warn(`[sandra.execute] Failed to add tool: ${errText}`);
      // Don't fail the whole step, Sandra can still work without the tool
    } else {
      console.log(`[sandra.execute] Added save_panel_draft tool`);
    }

    console.log(`[sandra.execute] Created Sandra agent: ${agentId}`);

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