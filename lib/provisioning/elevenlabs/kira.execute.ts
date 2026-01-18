// lib/provisioning/elevenlabs/kira.execute.ts
// Creates Kira insights agent WITH TOOLS using new tool_ids approach
// DEPENDS ON: vercel, supabase

import { ProvisionContext, StepResult } from '../types';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

// ============================================================================
// KIRA'S TOOL DEFINITIONS - NEW ELEVENLABS FORMAT (tool_ids approach)
// ============================================================================

interface ToolProperty {
  id: string;
  type: string;
  description: string;
  required: boolean;
}

function buildToolConfig(
  name: string,
  description: string,
  webhookUrl: string,
  bodyDescription: string,
  properties: ToolProperty[]
) {
  return {
    type: 'webhook',
    name,
    description,
    params: {
      method: 'POST',
      url: webhookUrl,
      request_body_schema: {
        type: 'object',
        description: bodyDescription,
        properties: {
          // Always include tool_name as constant
          tool_name: {
            type: 'string',
            description: 'Tool identifier',
            value_type: 'constant',
            constant: name,
            required: true,
          },
          // Add tool-specific properties
          ...Object.fromEntries(
            properties.map((prop) => [
              prop.id,
              {
                type: prop.type,
                description: prop.description,
                value_type: 'llm_prompt',
                required: prop.required,
              },
            ])
          ),
        },
        required: ['tool_name', ...properties.filter((p) => p.required).map((p) => p.id)],
      },
    },
  };
}

function getKiraToolConfigs(webhookUrl: string) {
  const toolsUrl = `${webhookUrl}/api/kira/tools`;

  return [
    buildToolConfig('list_panels', 'Get all interview panels with their statistics', toolsUrl, 'Parameters for listing interview panels', [
      { id: 'status', type: 'string', description: 'Filter: active, archived, or all', required: false },
    ]),

    buildToolConfig('get_panel', 'Get detailed information about a specific panel', toolsUrl, 'Parameters for getting panel details', [
      { id: 'panel_name', type: 'string', description: 'Name of the panel to retrieve', required: false },
      { id: 'panel_id', type: 'string', description: 'UUID of the panel to retrieve', required: false },
    ]),

    buildToolConfig('list_interviews', 'Get interviews for a panel with optional filters', toolsUrl, 'Parameters for listing interviews', [
      { id: 'panel_name', type: 'string', description: 'Name of the panel', required: false },
      { id: 'panel_id', type: 'string', description: 'UUID of the panel', required: false },
      { id: 'status', type: 'string', description: 'Filter: completed, in_progress, pending, or all', required: false },
      { id: 'limit', type: 'number', description: 'Maximum interviews to return', required: false },
    ]),

    buildToolConfig('get_interview', 'Get full transcript and analysis for a specific interview', toolsUrl, 'Parameters for getting interview details', [
      { id: 'interview_id', type: 'string', description: 'UUID of the interview', required: false },
      { id: 'participant_name', type: 'string', description: 'Name of the participant', required: false },
    ]),

    buildToolConfig('search_transcripts', 'Search across all interview transcripts for keywords or themes', toolsUrl, 'Parameters for searching transcripts', [
      { id: 'query', type: 'string', description: 'Keywords or phrases to search for', required: true },
      { id: 'panel_name', type: 'string', description: 'Limit search to specific panel', required: false },
      { id: 'limit', type: 'number', description: 'Maximum results to return', required: false },
    ]),

    buildToolConfig('get_statistics', 'Get quantitative metrics for panels and interviews', toolsUrl, 'Parameters for getting statistics', [
      { id: 'panel_name', type: 'string', description: 'Panel name for specific stats', required: false },
      { id: 'panel_id', type: 'string', description: 'Panel UUID for specific stats', required: false },
    ]),

    buildToolConfig('get_themes', 'Get aggregated themes and patterns from interview analyses', toolsUrl, 'Parameters for getting themes', [
      { id: 'panel_name', type: 'string', description: 'Panel name to analyze', required: false },
      { id: 'panel_id', type: 'string', description: 'Panel UUID to analyze', required: false },
    ]),

    buildToolConfig('recall_memory', "Search Kira's memory for past insights and findings", toolsUrl, 'Parameters for recalling memory', [
      { id: 'query', type: 'string', description: 'What to search for in memory', required: true },
      { id: 'memory_type', type: 'string', description: 'Type: insight, finding, user_preference, followup, or all', required: false },
    ]),

    buildToolConfig('save_memory', 'Save an important insight or finding for later recall', toolsUrl, 'Parameters for saving memory', [
      { id: 'content', type: 'string', description: 'The insight or finding to remember', required: true },
      { id: 'memory_type', type: 'string', description: 'Type: insight, finding, user_preference, or followup', required: true },
      { id: 'importance', type: 'number', description: 'Importance 1-10, higher = more important', required: false },
    ]),
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
    // =========================================================================
    // STEP 1: Create tools in the workspace first (new approach)
    // =========================================================================
    const toolConfigs = getKiraToolConfigs(vercelUrl);
    const toolIds: string[] = [];

    console.log(`[kira.execute] Creating ${toolConfigs.length} tools in workspace...`);

    for (const toolConfig of toolConfigs) {
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
          toolIds.push(toolData.id);
          console.log(`[kira.execute] Created tool: ${toolConfig.name} -> ${toolData.id}`);
        } else {
          const errText = await toolRes.text();
          console.warn(`[kira.execute] Failed to create tool ${toolConfig.name}: ${errText}`);
        }
      } catch (toolErr) {
        console.warn(`[kira.execute] Error creating tool ${toolConfig.name}:`, toolErr);
      }
    }

    console.log(`[kira.execute] Created ${toolIds.length}/${toolConfigs.length} tools`);

    // =========================================================================
    // STEP 2: Create agent with tool_ids (new approach)
    // =========================================================================
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
            prompt: {
              prompt: systemPrompt,
              tool_ids: toolIds, // NEW: Use tool_ids instead of tools array
            },
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
    console.log(`[kira.execute] Created Kira agent: ${agent.agent_id} with ${toolIds.length} tools`);

    return {
      status: 'advance',
      metadata: {
        kira_agent_id: agent.agent_id,
        kira_tool_ids: toolIds,
        kira_tools_count: toolIds.length,
      },
    };
  } catch (err) {
    return {
      status: 'fail',
      error: `Kira creation failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}