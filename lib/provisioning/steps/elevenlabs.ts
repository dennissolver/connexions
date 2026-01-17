// lib/provisioning/steps/elevenlabs.ts

import { ProvisionContext, ProvisionStepResult } from '../types';

const ELEVENLABS_API = 'https://api.elevenlabs.io/v1';

// Voice IDs
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

## Information to Gather (ask conversationally, one at a time):
1. Panel name - What should we call this interview panel?
2. Research objective - What are you trying to learn?
3. Target audience - Who will you be interviewing?
4. Interview style - Formal or conversational? How long?
5. Key topics - What specific topics should be covered?
6. Special requirements - Language, accessibility, sensitive topics?

## After Gathering Information
When you have enough information, summarize and call the save_draft tool.

## Important
- Never make up information
- If unclear, ask for clarification
- Be concise but thorough`;

const KIRA_PROMPT = `You are Kira, an AI Insights Agent. Your role is to help users explore and understand their interview data.

## Your Personality
- Analytical yet approachable
- Data-driven but explains clearly
- Highlights interesting patterns

## Your Capabilities
1. Search interviews by topic, sentiment, or keywords
2. Get summaries of interview panels
3. Find specific quotes and themes
4. Compare results across panels
5. Identify trends and patterns

## How to Respond
- Understand what the user wants to know
- Use tools to gather relevant data
- Present findings with specific examples
- Cite which interviews your insights come from

## Important
- Be accurate - only report what the data shows
- Acknowledge limitations if data is sparse
- Make insights actionable`;

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
 * Create a webhook tool for an agent
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
// SANDRA (SETUP AGENT)
// State: SANDRA_CREATING → SANDRA_READY
// ============================================================================

export async function createSandraAgent(ctx: ProvisionContext): Promise<ProvisionStepResult> {
  console.log(`[sandra] Creating Setup Agent for ${ctx.platformName}...`);

  const headers = {
    'xi-api-key': ctx.elevenLabsApiKey,
    'Content-Type': 'application/json',
  };

  const childPlatformUrl = ctx.metadata?.vercelUrl;
  if (!childPlatformUrl) {
    throw new Error('Vercel URL not found - cannot configure Sandra tool');
  }

  const webhookRouterUrl = ctx.parentWebhookUrl || `${ctx.publicBaseUrl}/api/webhooks/elevenlabs-router`;
  const agentName = `${ctx.platformName} Setup Agent`;

  // Create the save_draft tool
  console.log(`[sandra] Creating save_draft tool...`);
  const toolId = await createAgentTool(ctx.elevenLabsApiKey, {
    name: 'save_draft',
    description: 'Save the interview panel draft with all collected information',
    url: `${childPlatformUrl}/api/tools/save-draft`,
    parameters: {
      type: 'object',
      properties: {
        panel_name: { type: 'string', description: 'Name for the interview panel' },
        research_objective: { type: 'string', description: 'What the research aims to discover' },
        target_audience: { type: 'string', description: 'Who will be interviewed' },
        interview_style: { type: 'string', description: 'Formal or conversational, duration' },
        key_topics: { type: 'array', items: { type: 'string' }, description: 'Main topics to cover' },
        special_requirements: { type: 'string', description: 'Special requirements or considerations' },
      },
      required: ['panel_name', 'research_objective', 'target_audience'],
    },
  });

  // Create the agent
  console.log(`[sandra] Creating agent...`);
  const agentConfig = {
    name: agentName,
    conversation_config: {
      agent: {
        prompt: {
          prompt: SANDRA_PROMPT,
          tool_ids: [toolId],
        },
        first_message: `Hi! I'm Sandra, your research design partner. I'll help you create a custom AI interviewer. What's your name?`,
        language: 'en',
      },
      tts: { voice_id: VOICES.SANDRA, model_id: 'eleven_flash_v2' },
      stt: { provider: 'elevenlabs' },
      turn: { mode: 'turn' },
      conversation: { max_duration_seconds: 3600 },
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

  // Verify
  await new Promise(r => setTimeout(r, 1000));
  const verification = await verifyAgentExists(agent.agent_id, ctx.elevenLabsApiKey);
  if (!verification.exists) {
    throw new Error(`Sandra verification failed: ${agent.agent_id} not found`);
  }

  console.log(`[sandra] ✓ Sandra created and verified`);

  return {
    nextState: 'SANDRA_READY',
    metadata: {
      ...ctx.metadata,
      sandraAgentId: agent.agent_id,
      sandraAgentName: agentName,
      sandraToolId: toolId,
      sandraVerified: true,
      // Legacy compatibility
      elevenLabsAgentId: agent.agent_id,
      setupAgentId: agent.agent_id,
    },
  };
}

// ============================================================================
// KIRA (INSIGHTS AGENT)
// State: KIRA_CREATING → KIRA_READY
// ============================================================================

export async function createKiraAgent(ctx: ProvisionContext): Promise<ProvisionStepResult> {
  console.log(`[kira] Creating Insights Agent for ${ctx.platformName}...`);

  const headers = {
    'xi-api-key': ctx.elevenLabsApiKey,
    'Content-Type': 'application/json',
  };

  const childPlatformUrl = ctx.metadata?.vercelUrl;
  if (!childPlatformUrl) {
    throw new Error('Vercel URL not found - cannot configure Kira tools');
  }

  const webhookRouterUrl = ctx.parentWebhookUrl || `${ctx.publicBaseUrl}/api/webhooks/elevenlabs-router`;
  const agentName = `${ctx.platformName} Insights Agent`;

  // Create Kira's tools
  console.log(`[kira] Creating insights tools...`);

  const searchToolId = await createAgentTool(ctx.elevenLabsApiKey, {
    name: 'search_insights',
    description: 'Search interviews by topic, sentiment, or keywords',
    url: `${childPlatformUrl}/api/insights/search`,
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        sentiment: { type: 'string', enum: ['positive', 'negative', 'neutral', 'mixed'], description: 'Filter by sentiment' },
        panel_id: { type: 'string', description: 'Limit to specific panel' },
        limit: { type: 'number', description: 'Max results (default 10)' },
      },
      required: ['query'],
    },
  });

  const summaryToolId = await createAgentTool(ctx.elevenLabsApiKey, {
    name: 'get_panel_summary',
    description: 'Get aggregated summary for an interview panel',
    url: `${childPlatformUrl}/api/insights/summary`,
    parameters: {
      type: 'object',
      properties: {
        panel_id: { type: 'string', description: 'Panel ID to summarize' },
        include_themes: { type: 'boolean', description: 'Include theme analysis' },
        include_sentiment: { type: 'boolean', description: 'Include sentiment breakdown' },
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
        topic: { type: 'string', description: 'Topic to find quotes about' },
        panel_id: { type: 'string', description: 'Panel to search' },
        sentiment: { type: 'string', enum: ['positive', 'negative', 'neutral'], description: 'Filter by sentiment' },
        limit: { type: 'number', description: 'Max quotes (default 5)' },
      },
      required: ['topic'],
    },
  });

  const compareToolId = await createAgentTool(ctx.elevenLabsApiKey, {
    name: 'compare_panels',
    description: 'Compare results across multiple panels',
    url: `${childPlatformUrl}/api/insights/compare`,
    parameters: {
      type: 'object',
      properties: {
        panel_ids: { type: 'array', items: { type: 'string' }, description: 'Panel IDs to compare' },
        comparison_type: { type: 'string', enum: ['sentiment', 'themes', 'completion_rate', 'all'], description: 'What to compare' },
      },
      required: ['panel_ids'],
    },
  });

  const toolIds = [searchToolId, summaryToolId, quotesToolId, compareToolId];
  console.log(`[kira] Created ${toolIds.length} tools`);

  // Create the agent
  console.log(`[kira] Creating agent...`);
  const agentConfig = {
    name: agentName,
    conversation_config: {
      agent: {
        prompt: {
          prompt: KIRA_PROMPT,
          tool_ids: toolIds,
        },
        first_message: `Hi! I'm Kira, your insights assistant. I can help you explore your interview data. What would you like to know?`,
        language: 'en',
      },
      tts: { voice_id: VOICES.KIRA, model_id: 'eleven_flash_v2' },
      stt: { provider: 'elevenlabs' },
      turn: { mode: 'turn' },
      conversation: { max_duration_seconds: 3600 },
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

  // Verify
  await new Promise(r => setTimeout(r, 1000));
  const verification = await verifyAgentExists(agent.agent_id, ctx.elevenLabsApiKey);
  if (!verification.exists) {
    throw new Error(`Kira verification failed: ${agent.agent_id} not found`);
  }

  console.log(`[kira] ✓ Kira created and verified`);

  return {
    nextState: 'KIRA_READY',
    metadata: {
      ...ctx.metadata,
      kiraAgentId: agent.agent_id,
      kiraAgentName: agentName,
      kiraToolIds: toolIds,
      kiraVerified: true,
      // For UI components
      insightsAgentId: agent.agent_id,
    },
  };
}