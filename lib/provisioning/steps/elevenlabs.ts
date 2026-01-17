// lib/provisioning/steps/elevenlabs.ts

import { ProvisionContext, ProvisionStepResult } from '../types';

const ELEVENLABS_API = 'https://api.elevenlabs.io/v1';

// ============================================================================
// VOICE IDS
// ============================================================================

const VOICES = {
  SANDRA: 'EXAVITQu4vr4xnSDxMaL', // Sarah - friendly, professional
  KIRA: 'XB0fDUnXU5powFXDhCwa',   // Charlotte - warm, analytical
};

// ============================================================================
// PROMPTS
// ============================================================================

const SANDRA_PROMPT = `You are Sandra, a friendly AI Setup Agent. Your goal is to gather information from the user to create their custom AI interview panel.

## Your Personality
- Warm, professional, and efficient
- Ask one question at a time
- Confirm understanding before moving on
- Be encouraging and supportive

## Information to Gather (ask conversationally, one at a time):
1. Panel name - What should we call this interview panel?
2. Research objective - What are you trying to learn or understand?
3. Target audience - Who will you be interviewing? (e.g., customers, employees, patients)
4. Interview style - Formal or conversational? How long should interviews be?
5. Key topics - What specific topics or questions should be covered?
6. Any special requirements - Language, accessibility, sensitive topics?

## After Gathering Information
When you have enough information, summarize what you've learned and tell the user you'll create their panel. Then call the save_draft tool with the collected information.

## Important
- Never make up information - only use what the user tells you
- If something is unclear, ask for clarification
- Be concise but thorough`;

const KIRA_PROMPT = `You are Kira, an AI Insights Agent. Your role is to help users explore and understand their interview data.

## Your Personality
- Analytical yet approachable
- Data-driven but explains things clearly
- Curious and thorough
- Highlights interesting patterns and insights

## Your Capabilities
You can help users:
1. Search interviews by topic, sentiment, or keywords
2. Get summaries of interview panels
3. Find specific quotes and themes
4. Compare results across different panels
5. Identify trends and patterns

## How to Respond
- Start by understanding what the user wants to know
- Use your tools to gather relevant data
- Present findings clearly with specific examples
- Offer to dig deeper into interesting areas
- Always cite which interviews or panels your insights come from

## Important
- Be accurate - only report what the data shows
- Acknowledge limitations if data is sparse
- Suggest follow-up questions the user might explore
- Make insights actionable when possible`;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Verify an agent exists in ElevenLabs
 */
export async function verifyAgentExists(
  agentId: string,
  apiKey: string
): Promise<{ exists: boolean; agent?: any }> {
  try {
    const res = await fetch(`${ELEVENLABS_API}/convai/agents/${agentId}`, {
      headers: { 'xi-api-key': apiKey },
    });
    
    if (res.ok) {
      const agent = await res.json();
      return { exists: true, agent };
    }
    return { exists: false };
  } catch (error) {
    console.error(`[elevenlabs] Verify agent error:`, error);
    return { exists: false };
  }
}

/**
 * Create a tool for an agent
 */
async function createAgentTool(
  apiKey: string,
  toolConfig: {
    name: string;
    description: string;
    url: string;
    parameters: Record<string, any>;
  }
): Promise<string> {
  const res = await fetch(`${ELEVENLABS_API}/convai/agents/tools`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'webhook',
      name: toolConfig.name,
      description: toolConfig.description,
      webhook: {
        url: toolConfig.url,
        method: 'POST',
      },
      parameters: toolConfig.parameters,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to create tool: ${error}`);
  }

  const tool = await res.json();
  console.log(`[elevenlabs] Created tool: ${tool.tool_id}`);
  return tool.tool_id;
}

// ============================================================================
// SANDRA (SETUP AGENT) - Step 1
// ============================================================================

/**
 * Create Sandra - the Setup Agent for panel creation
 * State: SANDRA_CREATING → SANDRA_READY
 */
export async function createSandraAgent(ctx: ProvisionContext): Promise<ProvisionStepResult> {
  console.log(`[sandra] Creating Setup Agent for ${ctx.platformName}...`);

  const headers = {
    'xi-api-key': ctx.elevenLabsApiKey,
    'Content-Type': 'application/json',
  };

  const childPlatformUrl = ctx.metadata?.vercelUrl;
  if (!childPlatformUrl) {
    throw new Error('Vercel URL not found in metadata - cannot configure Sandra tool');
  }

  const webhookRouterUrl = `${ctx.publicBaseUrl}/api/webhooks/elevenlabs-router`;
  const agentName = `${ctx.platformName} Setup Agent`;

  // Step 1: Create the save_draft tool
  console.log(`[sandra] Creating save_draft tool...`);
  const toolId = await createAgentTool(ctx.elevenLabsApiKey, {
    name: 'save_draft',
    description: 'Save the interview panel draft with all collected information',
    url: `${childPlatformUrl}/api/tools/save-draft`,
    parameters: {
      type: 'object',
      properties: {
        panel_name: {
          type: 'string',
          description: 'Name for the interview panel',
        },
        research_objective: {
          type: 'string',
          description: 'What the research aims to discover',
        },
        target_audience: {
          type: 'string',
          description: 'Who will be interviewed',
        },
        interview_style: {
          type: 'string',
          description: 'Formal or conversational, duration preferences',
        },
        key_topics: {
          type: 'array',
          items: { type: 'string' },
          description: 'Main topics to cover in interviews',
        },
        special_requirements: {
          type: 'string',
          description: 'Any special requirements or considerations',
        },
      },
      required: ['panel_name', 'research_objective', 'target_audience'],
    },
  });

  // Step 2: Create the agent with the tool
  console.log(`[sandra] Creating agent with tool...`);
  const agentConfig = {
    name: agentName,
    conversation_config: {
      agent: {
        prompt: {
          prompt: SANDRA_PROMPT,
          tool_ids: [toolId],
        },
        first_message: `Hi! I'm Sandra, your research design partner. I'll help you create a custom AI interviewer that gets you the insights you need. What's your name?`,
        language: 'en',
      },
      tts: {
        voice_id: VOICES.SANDRA,
        model_id: 'eleven_flash_v2',
      },
      stt: {
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
        url: webhookRouterUrl,
        events: ['conversation.ended', 'conversation.transcript'],
      },
    },
  };

  const createRes = await fetch(`${ELEVENLABS_API}/convai/agents/create`, {
    method: 'POST',
    headers,
    body: JSON.stringify(agentConfig),
  });

  if (!createRes.ok) {
    const errorText = await createRes.text();
    console.error(`[sandra] Create failed: ${errorText}`);
    throw new Error(`Sandra creation failed: ${errorText}`);
  }

  const agent = await createRes.json();
  console.log(`[sandra] Created agent: ${agent.agent_id}`);

  // Step 3: Verify agent exists
  console.log(`[sandra] Verifying agent...`);
  await new Promise(r => setTimeout(r, 1000));
  
  const verification = await verifyAgentExists(agent.agent_id, ctx.elevenLabsApiKey);
  if (!verification.exists) {
    throw new Error(`Sandra verification failed: agent ${agent.agent_id} not found`);
  }

  console.log(`[sandra] ✅ Sandra created and verified`);

  return {
    nextState: 'SANDRA_READY',
    metadata: {
      ...ctx.metadata,
      // Sandra-specific metadata
      sandraAgentId: agent.agent_id,
      sandraAgentName: agentName,
      sandraToolId: toolId,
      sandraToolUrl: `${childPlatformUrl}/api/tools/save-draft`,
      sandraVerified: true,
      // Legacy compatibility (some code may still reference this)
      elevenLabsAgentId: agent.agent_id,
      setupAgentId: agent.agent_id,
    },
  };
}

// ============================================================================
// KIRA (INSIGHTS AGENT) - Step 2
// ============================================================================

/**
 * Create Kira - the Insights Agent for data exploration
 * State: KIRA_CREATING → KIRA_READY
 */
export async function createKiraAgent(ctx: ProvisionContext): Promise<ProvisionStepResult> {
  console.log(`[kira] Creating Insights Agent for ${ctx.platformName}...`);

  const headers = {
    'xi-api-key': ctx.elevenLabsApiKey,
    'Content-Type': 'application/json',
  };

  const childPlatformUrl = ctx.metadata?.vercelUrl;
  if (!childPlatformUrl) {
    throw new Error('Vercel URL not found in metadata - cannot configure Kira tools');
  }

  const webhookRouterUrl = `${ctx.publicBaseUrl}/api/webhooks/elevenlabs-router`;
  const agentName = `${ctx.platformName} Insights Agent`;

  // Step 1: Create Kira's tools
  console.log(`[kira] Creating insights tools...`);

  const searchToolId = await createAgentTool(ctx.elevenLabsApiKey, {
    name: 'search_insights',
    description: 'Search interviews by topic, sentiment, or keywords',
    url: `${childPlatformUrl}/api/insights/search`,
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query - topic, keyword, or phrase',
        },
        sentiment: {
          type: 'string',
          enum: ['positive', 'negative', 'neutral', 'mixed'],
          description: 'Filter by sentiment',
        },
        panel_id: {
          type: 'string',
          description: 'Limit search to specific panel (optional)',
        },
        limit: {
          type: 'number',
          description: 'Maximum results to return (default 10)',
        },
      },
      required: ['query'],
    },
  });

  const summaryToolId = await createAgentTool(ctx.elevenLabsApiKey, {
    name: 'get_panel_summary',
    description: 'Get aggregated summary and statistics for an interview panel',
    url: `${childPlatformUrl}/api/insights/summary`,
    parameters: {
      type: 'object',
      properties: {
        panel_id: {
          type: 'string',
          description: 'The panel ID to summarize',
        },
        include_themes: {
          type: 'boolean',
          description: 'Include theme analysis (default true)',
        },
        include_sentiment: {
          type: 'boolean',
          description: 'Include sentiment breakdown (default true)',
        },
      },
      required: ['panel_id'],
    },
  });

  const quotesToolId = await createAgentTool(ctx.elevenLabsApiKey, {
    name: 'get_quotes',
    description: 'Get specific quotes from interviews on a topic',
    url: `${childPlatformUrl}/api/insights/quotes`,
    parameters: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          description: 'Topic or theme to find quotes about',
        },
        panel_id: {
          type: 'string',
          description: 'Panel to search (optional - searches all if not specified)',
        },
        sentiment: {
          type: 'string',
          enum: ['positive', 'negative', 'neutral'],
          description: 'Filter quotes by sentiment',
        },
        limit: {
          type: 'number',
          description: 'Maximum quotes to return (default 5)',
        },
      },
      required: ['topic'],
    },
  });

  const compareToolId = await createAgentTool(ctx.elevenLabsApiKey, {
    name: 'compare_panels',
    description: 'Compare results across multiple interview panels',
    url: `${childPlatformUrl}/api/insights/compare`,
    parameters: {
      type: 'object',
      properties: {
        panel_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of panel IDs to compare',
        },
        comparison_type: {
          type: 'string',
          enum: ['sentiment', 'themes', 'completion_rate', 'all'],
          description: 'What aspect to compare (default: all)',
        },
      },
      required: ['panel_ids'],
    },
  });

  const toolIds = [searchToolId, summaryToolId, quotesToolId, compareToolId];
  console.log(`[kira] Created ${toolIds.length} tools`);

  // Step 2: Create the agent with tools
  console.log(`[kira] Creating agent with tools...`);
  const agentConfig = {
    name: agentName,
    conversation_config: {
      agent: {
        prompt: {
          prompt: KIRA_PROMPT,
          tool_ids: toolIds,
        },
        first_message: `Hi! I'm Kira, your insights assistant. I can help you explore your interview data - finding patterns, pulling quotes, and uncovering insights. What would you like to know?`,
        language: 'en',
      },
      tts: {
        voice_id: VOICES.KIRA,
        model_id: 'eleven_flash_v2',
      },
      stt: {
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
        url: webhookRouterUrl,
        events: ['conversation.ended', 'conversation.transcript'],
      },
    },
  };

  const createRes = await fetch(`${ELEVENLABS_API}/convai/agents/create`, {
    method: 'POST',
    headers,
    body: JSON.stringify(agentConfig),
  });

  if (!createRes.ok) {
    const errorText = await createRes.text();
    console.error(`[kira] Create failed: ${errorText}`);
    throw new Error(`Kira creation failed: ${errorText}`);
  }

  const agent = await createRes.json();
  console.log(`[kira] Created agent: ${agent.agent_id}`);

  // Step 3: Verify agent exists
  console.log(`[kira] Verifying agent...`);
  await new Promise(r => setTimeout(r, 1000));
  
  const verification = await verifyAgentExists(agent.agent_id, ctx.elevenLabsApiKey);
  if (!verification.exists) {
    throw new Error(`Kira verification failed: agent ${agent.agent_id} not found`);
  }

  console.log(`[kira] ✅ Kira created and verified`);

  return {
    nextState: 'KIRA_READY',
    metadata: {
      ...ctx.metadata,
      // Kira-specific metadata
      kiraAgentId: agent.agent_id,
      kiraAgentName: agentName,
      kiraToolIds: toolIds,
      kiraVerified: true,
      // Also store as insightsAgentId for UI components
      insightsAgentId: agent.agent_id,
    },
  };
}

// ============================================================================
// LEGACY EXPORTS (for backward compatibility)
// ============================================================================

/**
 * @deprecated Use createSandraAgent and createKiraAgent separately
 * This exists only for backward compatibility with existing code
 */
export async function createElevenLabsAgents(ctx: ProvisionContext): Promise<ProvisionStepResult> {
  console.warn('[elevenlabs] Using deprecated createElevenLabsAgents - use granular steps instead');
  
  // Create Sandra first
  const sandraResult = await createSandraAgent(ctx);
  
  // Update context with Sandra's metadata
  const updatedCtx = {
    ...ctx,
    metadata: sandraResult.metadata,
  };
  
  // Create Kira
  const kiraResult = await createKiraAgent(updatedCtx);
  
  // Merge metadata and return
  return {
    nextState: 'WEBHOOK_REGISTERING',
    metadata: {
      ...sandraResult.metadata,
      ...kiraResult.metadata,
    },
  };
}

// Alias for legacy code
export const createElevenLabsAgent = createElevenLabsAgents;
