// lib/provisioning/elevenlabs/kira.execute.ts
// Creates Kira insights agent WITH TOOLS - DEPENDS ON: vercel, supabase

import { ProvisionContext, StepResult } from '../types';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

// ============================================================================
// KIRA'S TOOL DEFINITIONS - CORRECT ELEVENLABS FORMAT
// ============================================================================

function getKiraTools(webhookUrl: string) {
  const toolsUrl = `${webhookUrl}/api/kira/tools`;

  // Helper to create a tool in the correct ElevenLabs format
  function createTool(
    name: string,
    description: string,
    bodyDescription: string,
    properties: Array<{
      id: string;
      type: string;
      description: string;
      required: boolean;
      isConstant?: boolean;
      constantValue?: string;
    }>
  ) {
    return {
      type: 'webhook',
      name,
      description,
      disable_interruptions: false,
      force_pre_tool_speech: 'auto',
      assignments: [],
      tool_call_sound: null,
      tool_call_sound_behavior: 'auto',
      execution_mode: 'immediate',
      api_schema: {
        url: toolsUrl,
        method: 'POST',
        path_params_schema: [],
        query_params_schema: [],
        request_body_schema: {
          id: 'body',
          type: 'object',
          description: bodyDescription,
          properties: [
            // Always include tool_name as constant
            {
              id: 'tool_name',
              type: 'string',
              value_type: 'constant',
              description: '',
              dynamic_variable: '',
              constant_value: name,
              enum: null,
              is_system_provided: false,
              required: true,
              properties: [],
            },
            // Add the tool-specific properties
            ...properties.map((prop) => ({
              id: prop.id,
              type: prop.type,
              value_type: prop.isConstant ? 'constant' : 'llm_prompt',
              description: prop.description,
              dynamic_variable: '',
              constant_value: prop.constantValue || '',
              enum: null,
              is_system_provided: false,
              required: prop.required,
              properties: [],
            })),
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

  return [
    createTool(
      'list_panels',
      'Get all interview panels with their statistics',
      'Parameters for listing interview panels',
      [
        {
          id: 'status',
          type: 'string',
          description: 'Filter: active, archived, or all',
          required: false,
        },
      ]
    ),

    createTool(
      'get_panel',
      'Get detailed information about a specific panel',
      'Parameters for getting panel details',
      [
        {
          id: 'panel_name',
          type: 'string',
          description: 'Name of the panel to retrieve',
          required: false,
        },
        {
          id: 'panel_id',
          type: 'string',
          description: 'UUID of the panel to retrieve',
          required: false,
        },
      ]
    ),

    createTool(
      'list_interviews',
      'Get interviews for a panel with optional filters',
      'Parameters for listing interviews',
      [
        {
          id: 'panel_name',
          type: 'string',
          description: 'Name of the panel',
          required: false,
        },
        {
          id: 'panel_id',
          type: 'string',
          description: 'UUID of the panel',
          required: false,
        },
        {
          id: 'status',
          type: 'string',
          description: 'Filter: completed, in_progress, pending, or all',
          required: false,
        },
        {
          id: 'limit',
          type: 'number',
          description: 'Maximum interviews to return',
          required: false,
        },
      ]
    ),

    createTool(
      'get_interview',
      'Get full transcript and analysis for a specific interview',
      'Parameters for getting interview details',
      [
        {
          id: 'interview_id',
          type: 'string',
          description: 'UUID of the interview',
          required: false,
        },
        {
          id: 'participant_name',
          type: 'string',
          description: 'Name of the participant',
          required: false,
        },
      ]
    ),

    createTool(
      'search_transcripts',
      'Search across all interview transcripts for keywords or themes',
      'Parameters for searching transcripts',
      [
        {
          id: 'query',
          type: 'string',
          description: 'Keywords or phrases to search for',
          required: true,
        },
        {
          id: 'panel_name',
          type: 'string',
          description: 'Limit search to specific panel',
          required: false,
        },
        {
          id: 'limit',
          type: 'number',
          description: 'Maximum results to return',
          required: false,
        },
      ]
    ),

    createTool(
      'get_statistics',
      'Get quantitative metrics for panels and interviews',
      'Parameters for getting statistics',
      [
        {
          id: 'panel_name',
          type: 'string',
          description: 'Panel name for specific stats',
          required: false,
        },
        {
          id: 'panel_id',
          type: 'string',
          description: 'Panel UUID for specific stats',
          required: false,
        },
      ]
    ),

    createTool(
      'get_themes',
      'Get aggregated themes and patterns from interview analyses',
      'Parameters for getting themes',
      [
        {
          id: 'panel_name',
          type: 'string',
          description: 'Panel name to analyze',
          required: false,
        },
        {
          id: 'panel_id',
          type: 'string',
          description: 'Panel UUID to analyze',
          required: false,
        },
      ]
    ),

    createTool(
      'recall_memory',
      "Search Kira's memory for past insights and findings",
      'Parameters for recalling memory',
      [
        {
          id: 'query',
          type: 'string',
          description: 'What to search for in memory',
          required: true,
        },
        {
          id: 'memory_type',
          type: 'string',
          description: 'Type: insight, finding, user_preference, followup, or all',
          required: false,
        },
      ]
    ),

    createTool(
      'save_memory',
      'Save an important insight or finding for later recall',
      'Parameters for saving memory',
      [
        {
          id: 'content',
          type: 'string',
          description: 'The insight or finding to remember',
          required: true,
        },
        {
          id: 'memory_type',
          type: 'string',
          description: 'Type: insight, finding, user_preference, or followup',
          required: true,
        },
        {
          id: 'importance',
          type: 'number',
          description: 'Importance 1-10, higher = more important',
          required: false,
        },
      ]
    ),
  ];
}

// ============================================================================
// MAIN EXECUTE FUNCTION
// ============================================================================

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

Your role is to help ${ctx.companyName} analyze their interview data. You have tools to access real data.

YOUR TOOLS:
- list_panels: See all interview panels and their stats
- get_panel: Get details about a specific panel
- list_interviews: Get interview list with filters
- get_interview: Get full transcript and analysis for one interview
- search_transcripts: Search across all interviews for topics/keywords
- get_statistics: Get quantitative metrics and trends
- get_themes: Get aggregated patterns, pain points, and desires
- recall_memory: Search your memory from past conversations
- save_memory: Remember important insights for future conversations

GUIDELINES:
- Always use your tools to find real data before answering
- Support conclusions with evidence from actual interviews
- When you discover something significant, use save_memory to remember it
- Be analytical, clear, and objective
- Cite specific interviews or quotes when making claims`;

    const tools = getKiraTools(vercelUrl);

    // Create agent first without tools
    const createRes = await fetch('https://api.elevenlabs.io/v1/convai/agents/create', {
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
            first_message: `Hello! I'm Kira, your insights analyst. I have access to all your interview data and can help you understand patterns, themes, and key findings. What would you like to explore?`,
            language: 'en',
          },
          tts: {
            model_id: 'eleven_turbo_v2_5',
            voice_id: 'pNInz6obpgDQGcFmaJgB', // Adam - professional male voice
          },
          asr: {
            provider: 'elevenlabs',
            quality: 'high',
          },
          turn: {
            mode: 'turn',
            turn_timeout: 10,
          },
          conversation: {
            max_duration_seconds: 3600, // 1 hour max for deep analysis sessions
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

    if (!createRes.ok) {
      const text = await createRes.text();
      return {
        status: 'fail',
        error: `ElevenLabs create agent error (${createRes.status}): ${text}`,
      };
    }

    const agent = await createRes.json();
    const agentId = agent.agent_id;

    console.log(`[kira.execute] Created agent: ${agentId}, now adding ${tools.length} tools...`);

    // Add tools one by one using the agent tools endpoint
    let toolsAdded = 0;
    for (const tool of tools) {
      try {
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

        if (toolRes.ok) {
          toolsAdded++;
          console.log(`[kira.execute] Added tool: ${tool.name}`);
        } else {
          const errText = await toolRes.text();
          console.warn(`[kira.execute] Failed to add tool ${tool.name}: ${errText}`);
        }
      } catch (toolErr) {
        console.warn(`[kira.execute] Error adding tool ${tool.name}:`, toolErr);
      }
    }

    console.log(`[kira.execute] Created Kira with ${toolsAdded}/${tools.length} tools: ${agentId}`);

    return {
      status: 'advance',
      metadata: {
        kira_agent_id: agentId,
        kira_tools_added: toolsAdded,
      },
    };
  } catch (err) {
    return {
      status: 'fail',
      error: `Kira creation failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}