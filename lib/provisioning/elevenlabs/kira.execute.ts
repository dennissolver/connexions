// lib/provisioning/elevenlabs/kira.execute.ts
// Creates Kira insights agent WITH TOOLS - DEPENDS ON: vercel, supabase

import { ProvisionContext, StepResult } from '../types';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

// ============================================================================
// KIRA'S TOOL DEFINITIONS
// ============================================================================

function getKiraTools(webhookUrl: string) {
  const toolWebhook = {
    url: `${webhookUrl}/api/kira/tools`,
    secret: process.env.ELEVENLABS_WEBHOOK_SECRET || 'connexions-webhook-secret',
  };

  return [
    {
      type: 'webhook',
      name: 'list_panels',
      description: 'Get a list of all interview panels with their statistics. Use this to see what research is available to analyze.',
      webhook: toolWebhook,
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['active', 'paused', 'archived', 'all'],
            description: "Filter by panel status. Default is 'active'.",
          },
        },
        required: [],
      },
    },
    {
      type: 'webhook',
      name: 'get_panel',
      description: 'Get detailed information about a specific interview panel including research goals, target audience, questions asked, and interview statistics.',
      webhook: toolWebhook,
      parameters: {
        type: 'object',
        properties: {
          panel_name: {
            type: 'string',
            description: 'The name of the panel to look up',
          },
          panel_id: {
            type: 'string',
            description: 'The UUID of the panel (use if you have it)',
          },
        },
        required: [],
      },
    },
    {
      type: 'webhook',
      name: 'list_interviews',
      description: 'Get a list of interviews, optionally filtered by panel, status, or date range. Returns participant info, duration, and evaluation summary.',
      webhook: toolWebhook,
      parameters: {
        type: 'object',
        properties: {
          panel_name: {
            type: 'string',
            description: 'Filter to interviews from this panel',
          },
          status: {
            type: 'string',
            enum: ['completed', 'in_progress', 'pending', 'all'],
            description: "Filter by interview status. Default is 'completed'.",
          },
          limit: {
            type: 'integer',
            description: 'Maximum number of interviews to return. Default is 20.',
          },
          days_back: {
            type: 'integer',
            description: 'Only include interviews from the last N days',
          },
        },
        required: [],
      },
    },
    {
      type: 'webhook',
      name: 'get_interview',
      description: 'Get the full transcript and analysis for a specific interview. Use this to dive deep into what a participant said.',
      webhook: toolWebhook,
      parameters: {
        type: 'object',
        properties: {
          interview_id: {
            type: 'string',
            description: 'The UUID of the interview',
          },
          participant_name: {
            type: 'string',
            description: "Search by participant name if you don't have the ID",
          },
          participant_email: {
            type: 'string',
            description: 'Search by participant email',
          },
        },
        required: [],
      },
    },
    {
      type: 'webhook',
      name: 'search_transcripts',
      description: 'Search across all interview transcripts for specific topics, keywords, or themes. Returns matching quotes with context.',
      webhook: toolWebhook,
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: "What to search for (e.g., 'pricing concerns', 'competitor mentions', 'feature requests')",
          },
          panel_name: {
            type: 'string',
            description: 'Optionally limit search to a specific panel',
          },
          limit: {
            type: 'integer',
            description: 'Maximum number of results. Default is 10.',
          },
        },
        required: ['query'],
      },
    },
    {
      type: 'webhook',
      name: 'get_statistics',
      description: 'Get quantitative statistics and metrics. Includes interview counts, completion rates, sentiment distribution, average scores, and trends.',
      webhook: toolWebhook,
      parameters: {
        type: 'object',
        properties: {
          panel_name: {
            type: 'string',
            description: 'Get stats for a specific panel. If omitted, returns platform-wide stats.',
          },
          metric: {
            type: 'string',
            enum: ['overview', 'sentiment', 'quality', 'completion', 'duration', 'trends'],
            description: "Specific metric to focus on. Default is 'overview' which includes all.",
          },
          days_back: {
            type: 'integer',
            description: 'Time period for trends. Default is 30 days.',
          },
        },
        required: [],
      },
    },
    {
      type: 'webhook',
      name: 'get_themes',
      description: 'Get aggregated themes and patterns across interviews. Shows common topics, pain points, and desires with supporting evidence.',
      webhook: toolWebhook,
      parameters: {
        type: 'object',
        properties: {
          panel_name: {
            type: 'string',
            description: 'Get themes for a specific panel',
          },
          theme_type: {
            type: 'string',
            enum: ['all', 'pain_points', 'desires', 'topics', 'quotes'],
            description: "Type of themes to retrieve. Default is 'all'.",
          },
          min_frequency: {
            type: 'integer',
            description: 'Only return themes mentioned at least this many times',
          },
        },
        required: [],
      },
    },
    {
      type: 'webhook',
      name: 'recall_memory',
      description: 'Search your memory for insights, context, or information from previous conversations and analyses.',
      webhook: toolWebhook,
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: "What to search for in memory (e.g., 'pricing insights', 'user preferences')",
          },
          memory_type: {
            type: 'string',
            enum: ['insight', 'user_preference', 'research_context', 'followup', 'correction', 'entity', 'all'],
            description: "Type of memory to search. Default is 'all'.",
          },
          panel_name: {
            type: 'string',
            description: 'Limit to memories related to a specific panel',
          },
        },
        required: ['query'],
      },
    },
    {
      type: 'webhook',
      name: 'save_memory',
      description: 'Save an important insight, finding, or piece of context to remember for future conversations. Use this when you discover something significant.',
      webhook: toolWebhook,
      parameters: {
        type: 'object',
        properties: {
          memory_type: {
            type: 'string',
            enum: ['insight', 'user_preference', 'research_context', 'followup', 'correction', 'entity'],
            description: 'What type of memory this is',
          },
          title: {
            type: 'string',
            description: "Short title for the memory (e.g., 'Price sensitivity is top concern')",
          },
          content: {
            type: 'string',
            description: 'Full description of what to remember',
          },
          importance: {
            type: 'integer',
            description: 'How important is this? 1-10, where 10 is critical. Default is 5.',
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: "Tags for easier retrieval (e.g., ['pricing', 'enterprise', 'blocker'])",
          },
          related_panel: {
            type: 'string',
            description: 'Panel name this memory relates to',
          },
        },
        required: ['memory_type', 'content'],
      },
    },
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
            first_message: `Hello! I'm Kira, your insights analyst. I have access to all your interview data and can help you understand patterns, themes, and key findings. What would you like to explore?`,
            language: 'en',
            tools: tools,
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

    if (!res.ok) {
      const text = await res.text();
      return {
        status: 'fail',
        error: `ElevenLabs API error (${res.status}): ${text}`,
      };
    }

    const agent = await res.json();
    console.log(`[kira.execute] Created with ${tools.length} tools: ${agent.agent_id}`);

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