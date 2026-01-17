// lib/provisioning/steps/elevenlabs.ts

import { ProvisionContext, ProvisionStepResult } from '../types';

const ELEVENLABS_API = 'https://api.elevenlabs.io/v1';

const VOICES = {
  SANDRA: 'EXAVITQu4vr4xnSDxMaL',
  KIRA: 'XB0fDUnXU5powFXDhCwa',
};

/* -------------------------------------------------------------------------- */
/*                                  PROMPTS                                   */
/* -------------------------------------------------------------------------- */

const SANDRA_PROMPT = `You are Sandra, a friendly AI Setup Agent. Your goal is to gather information from the user to create their custom AI interview panel.

Ask one question at a time. Confirm understanding before moving on.

When enough information is collected, call the save_draft tool.
`;

const KIRA_PROMPT = `You are Kira, an AI Insights Agent. You help users explore and understand interview results using search, summaries, and quotes.`;

/* -------------------------------------------------------------------------- */
/*                               TOOL FACTORY                                 */
/* -------------------------------------------------------------------------- */

/**
 * ElevenLabs webhook tools REQUIRE:
 * 1) tool.api_schema        → what the LLM calls
 * 2) webhook.api_schema     → how the HTTP request is shaped
 */
function buildWebhookTool(opts: {
  name: string;
  description: string;
  url: string;
  schema: any;
}) {
  return {
    type: 'webhook',
    name: opts.name,
    description: opts.description,

    // LLM function signature
    api_schema: opts.schema,

    // HTTP transport contract
    webhook: {
      url: opts.url,
      method: 'POST',
      api_schema: {
        type: 'object',
        properties: {
          body: opts.schema,
        },
        required: ['body'],
      },
    },
  };
}

/* -------------------------------------------------------------------------- */
/*                              VERIFY HELPERS                                 */
/* -------------------------------------------------------------------------- */

export async function verifyAgentExists(
  agentId: string,
  apiKey: string
): Promise<{ exists: boolean }> {
  try {
    const res = await fetch(`${ELEVENLABS_API}/convai/agents/${agentId}`, {
      headers: { 'xi-api-key': apiKey },
    });
    return { exists: res.ok };
  } catch {
    return { exists: false };
  }
}

/* -------------------------------------------------------------------------- */
/*                              SCHEMAS                                       */
/* -------------------------------------------------------------------------- */

const panelDraftSchema = {
  type: 'object',
  properties: {
    panel_name: { type: 'string' },
    research_objective: { type: 'string' },
    target_audience: { type: 'string' },
    interview_style: { type: 'string' },
    key_topics: {
      type: 'array',
      items: { type: 'string' },
    },
    special_requirements: { type: 'string' },
  },
  required: ['panel_name', 'research_objective', 'target_audience'],
};

const panelIdSchema = {
  type: 'object',
  properties: {
    panel_id: { type: 'string' },
  },
  required: ['panel_id'],
};

const searchSchema = {
  type: 'object',
  properties: {
    query: { type: 'string' },
    panel_id: { type: 'string' },
  },
  required: ['query'],
};

/* -------------------------------------------------------------------------- */
/*                              SANDRA AGENT                                  */
/* -------------------------------------------------------------------------- */

export async function createSandraAgent(
  ctx: ProvisionContext
): Promise<ProvisionStepResult> {
  const childPlatformUrl = ctx.metadata?.vercelUrl;
  if (!childPlatformUrl) {
    throw new Error('Missing Vercel URL for Sandra');
  }

  const webhookRouterUrl =
    ctx.parentWebhookUrl ||
    `${ctx.publicBaseUrl}/api/webhooks/elevenlabs-router`;

  const saveDraftTool = buildWebhookTool({
    name: 'save_draft',
    description: 'Save the interview panel draft',
    url: `${childPlatformUrl}/api/tools/save-draft`,
    schema: panelDraftSchema,
  });

  const agentConfig = {
    name: `${ctx.platformName} Setup Agent`,
    conversation_config: {
      agent: {
        prompt: {
          prompt: SANDRA_PROMPT,
          tools: [saveDraftTool],
        },
        first_message:
          `Hi! I'm Sandra. I'll help you design your interview panel. What should we call it?`,
        language: 'en',
      },
      tts: { voice_id: VOICES.SANDRA, model_id: 'eleven_flash_v2' },
      stt: { provider: 'elevenlabs' },
      turn: { mode: 'turn' },
    },
    platform_settings: {
      webhook: {
        url: webhookRouterUrl,
        events: ['conversation.ended', 'conversation.transcript'],
      },
    },
  };

  const res = await fetch(`${ELEVENLABS_API}/convai/agents/create`, {
    method: 'POST',
    headers: {
      'xi-api-key': ctx.elevenLabsApiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(agentConfig),
  });

  if (!res.ok) {
    throw new Error(`Sandra creation failed: ${await res.text()}`);
  }

  const agent = await res.json();

  await new Promise(r => setTimeout(r, 1000));
  if (!(await verifyAgentExists(agent.agent_id, ctx.elevenLabsApiKey)).exists) {
    throw new Error('Sandra verification failed');
  }

  return {
    nextState: 'SANDRA_READY',
    metadata: {
      ...ctx.metadata,
      sandraAgentId: agent.agent_id,
      setupAgentId: agent.agent_id,
      sandraVerified: true,
    },
  };
}

/* -------------------------------------------------------------------------- */
/*                               KIRA AGENT                                   */
/* -------------------------------------------------------------------------- */

export async function createKiraAgent(
  ctx: ProvisionContext
): Promise<ProvisionStepResult> {
  const childPlatformUrl = ctx.metadata?.vercelUrl;
  if (!childPlatformUrl) {
    throw new Error('Missing Vercel URL for Kira');
  }

  const webhookRouterUrl =
    ctx.parentWebhookUrl ||
    `${ctx.publicBaseUrl}/api/webhooks/elevenlabs-router`;

  const kiraTools = [
    buildWebhookTool({
      name: 'search_insights',
      description: 'Search interviews by keyword or theme',
      url: `${childPlatformUrl}/api/insights/search`,
      schema: searchSchema,
    }),
    buildWebhookTool({
      name: 'get_panel_summary',
      description: 'Summarise a panel',
      url: `${childPlatformUrl}/api/insights/summary`,
      schema: panelIdSchema,
    }),
    buildWebhookTool({
      name: 'get_quotes',
      description: 'Retrieve notable quotes',
      url: `${childPlatformUrl}/api/insights/quotes`,
      schema: panelIdSchema,
    }),
  ];

  const agentConfig = {
    name: `${ctx.platformName} Insights Agent`,
    conversation_config: {
      agent: {
        prompt: {
          prompt: KIRA_PROMPT,
          tools: kiraTools,
        },
        first_message:
          `Hi! I'm Kira. What insights would you like to explore?`,
        language: 'en',
      },
      tts: { voice_id: VOICES.KIRA, model_id: 'eleven_flash_v2' },
      stt: { provider: 'elevenlabs' },
      turn: { mode: 'turn' },
    },
    platform_settings: {
      webhook: {
        url: webhookRouterUrl,
        events: ['conversation.ended', 'conversation.transcript'],
      },
    },
  };

  const res = await fetch(`${ELEVENLABS_API}/convai/agents/create`, {
    method: 'POST',
    headers: {
      'xi-api-key': ctx.elevenLabsApiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(agentConfig),
  });

  if (!res.ok) {
    throw new Error(`Kira creation failed: ${await res.text()}`);
  }

  const agent = await res.json();

  await new Promise(r => setTimeout(r, 1000));
  if (!(await verifyAgentExists(agent.agent_id, ctx.elevenLabsApiKey)).exists) {
    throw new Error('Kira verification failed');
  }

  return {
    nextState: 'KIRA_READY',
    metadata: {
      ...ctx.metadata,
      kiraAgentId: agent.agent_id,
      insightsAgentId: agent.agent_id,
      kiraVerified: true,
    },
  };
}
