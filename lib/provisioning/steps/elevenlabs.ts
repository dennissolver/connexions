// lib/provisioning/steps/elevenlabs.ts

import { ProvisionContext, ProvisionStepResult } from '../types';

const ELEVENLABS_API = 'https://api.elevenlabs.io/v1';

const VOICES = {
  SANDRA: 'EXAVITQu4vr4xnSDxMaL',
  KIRA: 'XB0fDUnXU5powFXDhCwa',
};

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

## How to Respond
- Understand what the user wants to know
- Use tools to gather relevant data
- Present findings with specific examples

## Important
- Be accurate - only report what the data shows
- Acknowledge limitations if data is sparse`;

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

  // Define tool inline with agent creation
  const saveDraftTool = {
    type: 'webhook',
    name: 'save_draft',
    description: 'Save the interview panel draft with all collected information',
    webhook: {
      url: `${childPlatformUrl}/api/tools/save-draft`,
      method: 'POST',
    },
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
  };

  const agentConfig = {
    name: agentName,
    conversation_config: {
      agent: {
        prompt: {
          prompt: SANDRA_PROMPT,
          tools: [saveDraftTool],
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

  console.log(`[sandra] Creating agent with inline tools...`);
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

  await new Promise(r => setTimeout(r, 1000));
  const verification = await verifyAgentExists(agent.agent_id, ctx.elevenLabsApiKey);
  if (!verification.exists) {
    throw new Error(`Sandra verification failed: ${agent.agent_id} not found`);
  }

  console.log(`[sandra] Sandra created and verified`);
  return {
    nextState: 'SANDRA_READY',
    metadata: {
      ...ctx.metadata,
      sandraAgentId: agent.agent_id,
      sandraAgentName: agentName,
      sandraVerified: true,
      elevenLabsAgentId: agent.agent_id,
      setupAgentId: agent.agent_id,
    },
  };
}

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

  // Define Kira's tools inline
  const kiraTools = [
    {
      type: 'webhook',
      name: 'search_insights',
      description: 'Search interviews for specific topics, themes, or keywords',
      webhook: { url: `${childPlatformUrl}/api/insights/search`, method: 'POST' },
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          panel_id: { type: 'string', description: 'Optional panel ID to search within' },
        },
        required: ['query'],
      },
    },
    {
      type: 'webhook',
      name: 'get_panel_summary',
      description: 'Get a summary of insights from a panel',
      webhook: { url: `${childPlatformUrl}/api/insights/summary`, method: 'POST' },
      parameters: {
        type: 'object',
        properties: {
          panel_id: { type: 'string', description: 'Panel ID to summarize' },
        },
        required: ['panel_id'],
      },
    },
    {
      type: 'webhook',
      name: 'get_quotes',
      description: 'Get notable quotes from interviews',
      webhook: { url: `${childPlatformUrl}/api/insights/quotes`, method: 'POST' },
      parameters: {
        type: 'object',
        properties: {
          panel_id: { type: 'string', description: 'Panel ID' },
          theme: { type: 'string', description: 'Optional theme to filter by' },
        },
        required: ['panel_id'],
      },
    },
  ];

  const agentConfig = {
    name: agentName,
    conversation_config: {
      agent: {
        prompt: {
          prompt: KIRA_PROMPT,
          tools: kiraTools,
        },
        first_message: `Hi! I'm Kira, your insights analyst. I can help you explore your interview data. What would you like to know?`,
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

  console.log(`[kira] Creating agent with inline tools...`);
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

  await new Promise(r => setTimeout(r, 1000));
  const verification = await verifyAgentExists(agent.agent_id, ctx.elevenLabsApiKey);
  if (!verification.exists) {
    throw new Error(`Kira verification failed: ${agent.agent_id} not found`);
  }

  console.log(`[kira] Kira created and verified`);
  return {
    nextState: 'KIRA_READY',
    metadata: {
      ...ctx.metadata,
      kiraAgentId: agent.agent_id,
      kiraAgentName: agentName,
      kiraVerified: true,
      insightsAgentId: agent.agent_id,
    },
  };
}
