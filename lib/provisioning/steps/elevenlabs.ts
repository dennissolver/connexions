// lib/provisioning/steps/elevenlabs.ts

import { ProvisionContext, ProvisionStepResult } from '../types';

const ELEVENLABS_API = 'https://api.elevenlabs.io/v1';

const SETUP_AGENT_PROMPT = `You are Sandra, a friendly AI Setup Agent. Your goal is to gather information from the user to create their custom AI interview panel.

## Ask these questions conversationally (one at a time):
1. What name do you want for your Interview Panel?
2. What type of interviews do you want to conduct? (e.g., customer feedback, employee onboarding, market research)
3. Who will be interviewed? (e.g., customers, job candidates, employees)
4. What tone should the interviewer have? (e.g., professional, friendly, casual)
5. How long should interviews typically last? (e.g., 5 minutes, 10 minutes, 15 minutes)
6. What are 3-5 key questions or topics the interviewer should cover?

## Rules
- Be conversational and natural
- Ask ONE question at a time
- Keep responses under 30 words
- Confirm details before saving

## Wrap Up
When you have all the information, use the save_panel_draft tool to save it. Then say: "Perfect! I've saved your panel as a draft. Check your screen to review and finalize it!"`;

/**
 * Create a webhook tool in the ElevenLabs workspace
 * Returns the tool ID if successful
 */
async function createOrGetTool(
  apiKey: string,
  toolName: string,
  toolDescription: string,
  webhookUrl: string,
  parameters: any
): Promise<string | null> {
  const headers = {
    'xi-api-key': apiKey,
    'Content-Type': 'application/json',
  };

  // First, list existing tools to check if it already exists
  console.log(`[elevenlabs] Checking for existing tool: ${toolName}`);
  const listRes = await fetch(`${ELEVENLABS_API}/convai/tools`, { headers });

  if (listRes.ok) {
    const data = await listRes.json();
    const existingTool = data.tools?.find((t: any) =>
      t.tool_config?.name === toolName || t.name === toolName
    );

    if (existingTool) {
      console.log(`[elevenlabs] Found existing tool: ${existingTool.id}`);

      // Update the tool with current webhook URL
      const updateRes = await fetch(`${ELEVENLABS_API}/convai/tools/${existingTool.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          tool_config: {
            type: 'webhook',
            name: toolName,
            description: toolDescription,
            params: {
              method: 'POST',
              url: webhookUrl,
              body_params: parameters.properties ?
                Object.entries(parameters.properties).map(([key, value]: [string, any]) => ({
                  name: key,
                  description: value.description || key,
                  type: value.type || 'string',
                  required: parameters.required?.includes(key) || false,
                })) : [],
            },
          },
        }),
      });

      if (updateRes.ok) {
        console.log(`[elevenlabs] Updated existing tool: ${existingTool.id}`);
        return existingTool.id;
      } else {
        console.warn(`[elevenlabs] Failed to update tool: ${await updateRes.text()}`);
        // Still return the existing ID even if update failed
        return existingTool.id;
      }
    }
  }

  // Create new tool
  console.log(`[elevenlabs] Creating new tool: ${toolName}`);
  console.log(`[elevenlabs] Webhook URL: ${webhookUrl}`);

  const toolConfig = {
    tool_config: {
      type: 'webhook',
      name: toolName,
      description: toolDescription,
      params: {
        method: 'POST',
        url: webhookUrl,
        body_params: parameters.properties ?
          Object.entries(parameters.properties).map(([key, value]: [string, any]) => ({
            name: key,
            description: value.description || key,
            type: value.type === 'array' ? 'array' : (value.type || 'string'),
            required: parameters.required?.includes(key) || false,
          })) : [],
      },
    },
  };

  console.log(`[elevenlabs] Tool config:`, JSON.stringify(toolConfig, null, 2));

  const createRes = await fetch(`${ELEVENLABS_API}/convai/tools`, {
    method: 'POST',
    headers,
    body: JSON.stringify(toolConfig),
  });

  if (!createRes.ok) {
    const errorText = await createRes.text();
    console.error(`[elevenlabs] Failed to create tool: ${errorText}`);
    return null;
  }

  const tool = await createRes.json();
  console.log(`[elevenlabs] Created tool with ID: ${tool.id}`);
  return tool.id;
}

/**
 * Verify an ElevenLabs agent exists and has the expected tools
 */
async function verifyAgentExists(agentId: string, apiKey: string): Promise<{ exists: boolean; agent?: any }> {
  try {
    const res = await fetch(`${ELEVENLABS_API}/convai/agents/${agentId}`, {
      headers: { 'xi-api-key': apiKey },
    });

    if (res.ok) {
      const agent = await res.json();
      console.log(`[elevenlabs] Verified agent exists: ${agent.name} (${agentId})`);

      // Log tool configuration
      const toolIds = agent.conversation_config?.agent?.prompt?.tool_ids || [];
      console.log(`[elevenlabs] Agent tool_ids: ${JSON.stringify(toolIds)}`);

      return { exists: true, agent };
    }

    console.error(`[elevenlabs] Agent verification failed: ${res.status}`);
    return { exists: false };
  } catch (err: any) {
    console.error(`[elevenlabs] Agent verification error: ${err.message}`);
    return { exists: false };
  }
}

export async function createElevenLabsAgent(ctx: ProvisionContext): Promise<ProvisionStepResult> {
  const agentName = `${ctx.companyName || ctx.platformName} Setup Agent`;
  const childPlatformUrl = ctx.metadata.vercelUrl || `https://${ctx.projectSlug}.vercel.app`;
  const toolWebhookUrl = `${childPlatformUrl}/api/tools/save-draft`;

  // Centralized router webhook URL - all agents route through parent
  const routerWebhookUrl = `${ctx.publicBaseUrl}/api/webhooks/elevenlabs-router`;

  const headers = {
    'xi-api-key': ctx.elevenLabsApiKey,
    'Content-Type': 'application/json',
  };

  console.log(`[elevenlabs] Agent name: ${agentName}`);
  console.log(`[elevenlabs] Tool webhook URL: ${toolWebhookUrl}`);
  console.log(`[elevenlabs] Router webhook URL: ${routerWebhookUrl}`);

  // Step 1: Create or get the save_panel_draft tool
  const toolParameters = {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Name of the interview panel',
      },
      description: {
        type: 'string',
        description: 'Brief description of what this panel is for',
      },
      interview_type: {
        type: 'string',
        description: 'Type of interviews (e.g., customer feedback, market research)',
      },
      target_audience: {
        type: 'string',
        description: 'Who will be interviewed',
      },
      tone: {
        type: 'string',
        description: 'Tone of the interviewer (e.g., professional, friendly)',
      },
      duration_minutes: {
        type: 'number',
        description: 'Expected interview duration in minutes',
      },
      questions: {
        type: 'array',
        description: 'List of key questions or topics to cover',
      },
    },
    required: ['name', 'description', 'questions'],
  };

  const toolId = await createOrGetTool(
    ctx.elevenLabsApiKey,
    'save_panel_draft',
    'Save the interview panel configuration as a draft. The user will see it on screen where they can review and edit before creating. Call this when the user has confirmed all details.',
    toolWebhookUrl,
    toolParameters
  );

  if (!toolId) {
    throw new Error('Failed to create save_panel_draft tool');
  }

  console.log(`[elevenlabs] Tool ID for save_panel_draft: ${toolId}`);

  // Step 2: Check if agent already exists
  const listRes = await fetch(`${ELEVENLABS_API}/convai/agents`, { headers });

  if (listRes.ok) {
    const data = await listRes.json();
    const existing = data.agents?.find((a: any) => a.name === agentName);

    if (existing) {
      console.log(`[elevenlabs] Found existing agent: ${existing.agent_id}`);
      console.log(`[elevenlabs] Updating agent with tool_ids...`);

      // Update agent to link the tool
      const updateRes = await fetch(`${ELEVENLABS_API}/convai/agents/${existing.agent_id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          conversation_config: {
            agent: {
              prompt: {
                prompt: SETUP_AGENT_PROMPT.replace(/\{platformName\}/g, ctx.platformName),
                tool_ids: [toolId],
              },
              first_message: `Hello! I'm Sandra, your AI setup assistant for ${ctx.platformName}. I'll help you create a custom interview panel. Ready to get started?`,
              language: 'en',
            },
            tts: {
              voice_id: 'EXAVITQu4vr4xnSDxMaL', // Sarah voice
              model_id: 'eleven_flash_v2',
            },
          },
          platform_settings: {
            webhook: {
              url: routerWebhookUrl,
              events: ['conversation.ended', 'conversation.transcript'],
            },
          },
        }),
      });

      if (updateRes.ok) {
        console.log(`[elevenlabs] Updated agent ${existing.agent_id} with tool_ids`);
      } else {
        const errorText = await updateRes.text();
        console.error(`[elevenlabs] Failed to update agent: ${errorText}`);
        throw new Error(`Failed to update agent: ${errorText}`);
      }

      // Verify the update
      const verification = await verifyAgentExists(existing.agent_id, ctx.elevenLabsApiKey);
      if (!verification.exists) {
        throw new Error(`Agent verification failed after update`);
      }

      return {
        nextState: 'WEBHOOK_REGISTERING',
        metadata: {
          ...ctx.metadata,
          elevenLabsAgentId: existing.agent_id,
          elevenLabsAgentName: existing.name,
          elevenLabsToolId: toolId,
          elevenLabsToolUrl: toolWebhookUrl,
          elevenLabsRouterUrl: routerWebhookUrl,
          elevenLabsVerified: true,
        },
      };
    }
  }

  // Step 3: Create new agent with tool_ids
  console.log(`[elevenlabs] Creating new agent: ${agentName}`);

  const agentConfig = {
    name: agentName,
    conversation_config: {
      agent: {
        prompt: {
          prompt: SETUP_AGENT_PROMPT.replace(/\{platformName\}/g, ctx.platformName),
          tool_ids: [toolId],
        },
        first_message: `Hello! I'm Sandra, your AI setup assistant for ${ctx.platformName}. I'll help you create a custom interview panel. Ready to get started?`,
        language: 'en',
      },
      tts: {
        voice_id: 'EXAVITQu4vr4xnSDxMaL', // Sarah voice
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
        url: routerWebhookUrl,
        events: ['conversation.ended', 'conversation.transcript'],
      },
    },
  };

  console.log(`[elevenlabs] Agent config:`, JSON.stringify(agentConfig, null, 2));

  const createRes = await fetch(`${ELEVENLABS_API}/convai/agents/create`, {
    method: 'POST',
    headers,
    body: JSON.stringify(agentConfig),
  });

  if (!createRes.ok) {
    const errorText = await createRes.text();
    console.error(`[elevenlabs] Create failed: ${errorText}`);
    throw new Error(`ElevenLabs create failed: ${errorText}`);
  }

  const agent = await createRes.json();
  console.log(`[elevenlabs] Created agent: ${agent.agent_id}`);

  // Verify the agent was created correctly
  console.log(`[elevenlabs] Verifying agent creation...`);
  await new Promise(r => setTimeout(r, 1000));

  const verification = await verifyAgentExists(agent.agent_id, ctx.elevenLabsApiKey);
  if (!verification.exists) {
    throw new Error(`Agent creation verification failed: ${agent.agent_id} not found`);
  }

  // Check if tool_ids are present
  const toolIds = verification.agent?.conversation_config?.agent?.prompt?.tool_ids || [];
  if (!toolIds.includes(toolId)) {
    console.warn(`[elevenlabs] WARNING: tool_id ${toolId} not found in agent's tool_ids: ${JSON.stringify(toolIds)}`);
  } else {
    console.log(`[elevenlabs] Tool properly linked to agent`);
  }

  return {
    nextState: 'WEBHOOK_REGISTERING',
    metadata: {
      ...ctx.metadata,
      elevenLabsAgentId: agent.agent_id,
      elevenLabsAgentName: agentName,
      elevenLabsToolId: toolId,
      elevenLabsToolUrl: toolWebhookUrl,
      elevenLabsRouterUrl: routerWebhookUrl,
      elevenLabsVerified: true,
    },
  };
}