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
 * Create a unique tool for this agent with agent_id baked into the URL
 */
async function createAgentTool(
  apiKey: string,
  agentId: string,
  routerBaseUrl: string
): Promise<string> {
  const headers = {
    'xi-api-key': apiKey,
    'Content-Type': 'application/json',
  };

  const toolName = 'save_panel_draft';
  const toolDescription = 'Save the interview panel configuration as a draft. The user will see it on screen where they can review and edit before creating. Call this when the user has confirmed all details.';

  // Bake the agent_id into the URL so the router knows where to forward
  const toolUrl = `${routerBaseUrl}?agent_id=${agentId}`;

  console.log(`[elevenlabs] Creating tool for agent ${agentId}`);
  console.log(`[elevenlabs] Tool URL: ${toolUrl}`);

  const toolConfig = {
    tool_config: {
      type: 'webhook',
      name: toolName,
      description: toolDescription,
      api_schema: {
        url: toolUrl,
        method: 'POST',
        content_type: 'application/json',
        request_body_schema: {
          type: 'object',
          required: ['name', 'questions'],
          properties: {
            name: { type: 'string', description: 'Name of the interview panel' },
            description: { type: 'string', description: 'Brief description of what this panel is for' },
            questions: {
              type: 'array',
              description: 'List of interview questions',
              items: { type: 'string', description: 'A single interview question' }
            },
            tone: { type: 'string', description: 'Interview tone (e.g., professional, friendly)' },
            target_audience: { type: 'string', description: 'Who will be interviewed' },
            duration_minutes: { type: 'number', description: 'Expected interview duration in minutes' },
            agent_name: { type: 'string', description: 'Name for the AI interviewer' },
            voice_gender: { type: 'string', description: 'Voice gender: male or female' },
            closing_message: { type: 'string', description: 'Thank you message at end of interview' },
            greeting: { type: 'string', description: 'Optional custom opening line' },
          },
        },
      },
    },
  };

  const createRes = await fetch(`${ELEVENLABS_API}/convai/tools`, {
    method: 'POST',
    headers,
    body: JSON.stringify(toolConfig),
  });

  if (!createRes.ok) {
    const errorText = await createRes.text();
    console.error(`[elevenlabs] Failed to create tool: ${errorText}`);
    throw new Error(`Failed to create tool: ${errorText}`);
  }

  const tool = await createRes.json();
  console.log(`[elevenlabs] Created tool with ID: ${tool.id}`);
  return tool.id;
}

/**
 * Verify an ElevenLabs agent exists
 */
async function verifyAgentExists(agentId: string, apiKey: string): Promise<{ exists: boolean; agent?: any }> {
  try {
    const res = await fetch(`${ELEVENLABS_API}/convai/agents/${agentId}`, {
      headers: { 'xi-api-key': apiKey },
    });

    if (res.ok) {
      const agent = await res.json();
      console.log(`[elevenlabs] Verified agent exists: ${agent.name} (${agentId})`);
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

  // Tool routes through the parent's save-draft-router
  const toolRouterUrl = `${ctx.publicBaseUrl}/api/tools/save-draft-router`;

  // Webhooks route through the parent's elevenlabs-router
  const webhookRouterUrl = `${ctx.publicBaseUrl}/api/webhooks/elevenlabs-router`;

  const headers = {
    'xi-api-key': ctx.elevenLabsApiKey,
    'Content-Type': 'application/json',
  };

  console.log(`[elevenlabs] Agent name: ${agentName}`);
  console.log(`[elevenlabs] Tool router base URL: ${toolRouterUrl}`);
  console.log(`[elevenlabs] Webhook router URL: ${webhookRouterUrl}`);

  // Check if agent already exists for this platform
  const listRes = await fetch(`${ELEVENLABS_API}/convai/agents`, { headers });

  if (listRes.ok) {
    const data = await listRes.json();
    const existing = data.agents?.find((a: any) => a.name === agentName);

    if (existing) {
      console.log(`[elevenlabs] Found existing agent: ${existing.agent_id}`);

      // Create a new tool with correct URL for this agent
      const toolId = await createAgentTool(ctx.elevenLabsApiKey, existing.agent_id, toolRouterUrl);

      // Update agent with new tool and webhook
      console.log(`[elevenlabs] Updating agent with new tool...`);
      const updateRes = await fetch(`${ELEVENLABS_API}/convai/agents/${existing.agent_id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          conversation_config: {
            agent: {
              prompt: {
                prompt: SETUP_AGENT_PROMPT,
                tool_ids: [toolId],
              },
              first_message: `Hello! I'm Sandra, your AI setup assistant for ${ctx.platformName}. I'll help you create a custom interview panel. Ready to get started?`,
              language: 'en',
            },
            tts: {
              voice_id: 'EXAVITQu4vr4xnSDxMaL',
              model_id: 'eleven_flash_v2',
            },
          },
          platform_settings: {
            webhook: {
              url: webhookRouterUrl,
              events: ['conversation.ended', 'conversation.transcript'],
            },
          },
        }),
      });

      if (!updateRes.ok) {
        const errorText = await updateRes.text();
        console.error(`[elevenlabs] Failed to update agent: ${errorText}`);
        throw new Error(`Failed to update agent: ${errorText}`);
      }

      console.log(`[elevenlabs] Updated agent ${existing.agent_id}`);

      return {
        nextState: 'WEBHOOK_REGISTERING',
        metadata: {
          ...ctx.metadata,
          elevenLabsAgentId: existing.agent_id,
          elevenLabsAgentName: agentName,
          elevenLabsToolId: toolId,
          elevenLabsToolUrl: `${toolRouterUrl}?agent_id=${existing.agent_id}`,
          elevenLabsRouterUrl: webhookRouterUrl,
          elevenLabsVerified: true,
        },
      };
    }
  }

  // Create new agent first (without tool, to get the agent_id)
  console.log(`[elevenlabs] Creating new agent: ${agentName}`);

  const initialAgentConfig = {
    name: agentName,
    conversation_config: {
      agent: {
        prompt: {
          prompt: SETUP_AGENT_PROMPT,
          tool_ids: [], // Will add tool after we have agent_id
        },
        first_message: `Hello! I'm Sandra, your AI setup assistant for ${ctx.platformName}. I'll help you create a custom interview panel. Ready to get started?`,
        language: 'en',
      },
      tts: {
        voice_id: 'EXAVITQu4vr4xnSDxMaL',
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
    body: JSON.stringify(initialAgentConfig),
  });

  if (!createRes.ok) {
    const errorText = await createRes.text();
    console.error(`[elevenlabs] Create failed: ${errorText}`);
    throw new Error(`ElevenLabs create failed: ${errorText}`);
  }

  const agent = await createRes.json();
  console.log(`[elevenlabs] Created agent: ${agent.agent_id}`);

  // Now create the tool with the agent_id baked into the URL
  const toolId = await createAgentTool(ctx.elevenLabsApiKey, agent.agent_id, toolRouterUrl);

  // Update the agent to use the tool
  console.log(`[elevenlabs] Updating agent with tool...`);
  const updateRes = await fetch(`${ELEVENLABS_API}/convai/agents/${agent.agent_id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      conversation_config: {
        agent: {
          prompt: {
            tool_ids: [toolId],
          },
        },
      },
    }),
  });

  if (!updateRes.ok) {
    console.warn(`[elevenlabs] Failed to add tool to agent: ${await updateRes.text()}`);
  } else {
    console.log(`[elevenlabs] Added tool to agent`);
  }

  // Verify the agent was created correctly
  await new Promise(r => setTimeout(r, 1000));
  const verification = await verifyAgentExists(agent.agent_id, ctx.elevenLabsApiKey);
  if (!verification.exists) {
    throw new Error(`Agent creation verification failed: ${agent.agent_id} not found`);
  }

  return {
    nextState: 'WEBHOOK_REGISTERING',
    metadata: {
      ...ctx.metadata,
      elevenLabsAgentId: agent.agent_id,
      elevenLabsAgentName: agentName,
      elevenLabsToolId: toolId,
      elevenLabsToolUrl: `${toolRouterUrl}?agent_id=${agent.agent_id}`,
      elevenLabsRouterUrl: webhookRouterUrl,
      elevenLabsVerified: true,
    },
  };
}