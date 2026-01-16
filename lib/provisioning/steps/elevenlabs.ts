// lib/provisioning/steps/elevenlabs.ts

import { ProvisionContext, ProvisionStepResult } from '../types';

const ELEVENLABS_API = 'https://api.elevenlabs.io/v1';

const SETUP_AGENT_PROMPT = `You are Sandra, a warm and friendly AI Setup Agent. Your goal is to help users create their custom AI interview panel through a natural conversation.

## Information to Gather (ask conversationally, one at a time):
1. Panel name - What do they want to call their interview panel?
2. Interview type - What kind of interviews? (customer feedback, market research, employee check-ins, candidate screening, etc.)
3. Target audience - Who will be interviewed? (customers, employees, job candidates, etc.)
4. Tone - How should the AI interviewer sound? (professional, friendly, casual, empathetic)
5. Duration - How long should interviews typically last? (5, 10, or 15 minutes)
6. Key questions - What 3-5 questions or topics should be covered?

## Conversation Style
- Be warm, encouraging, and conversational
- Ask ONE question at a time, then listen
- Keep your responses short (under 30 words)
- Use their answers to inform follow-up questions
- If something is unclear, ask a brief clarifying question
- Acknowledge good ideas with brief positive feedback

## Before Saving
Briefly summarize what you've collected:
"So just to confirm - you want [panel name] for [interview type] interviews with [audience], using a [tone] tone, lasting about [duration] minutes, covering [brief topic summary]. Does that sound right?"

Wait for their confirmation before saving.

## After Saving (IMPORTANT)
Once you've used the save_panel_draft tool successfully, say exactly this:
"Perfect! Your draft is saved. Now just click the red End Call button on your screen, and you'll be taken straight to your draft page where you can review everything and make any tweaks before going live. Like magic!"

Do NOT continue the conversation after this - let them end the call.`;

/**
 * Create a unique tool for this agent pointing directly to the child platform
 */
async function createAgentTool(
  apiKey: string,
  childPlatformUrl: string
): Promise<string> {
  const headers = {
    'xi-api-key': apiKey,
    'Content-Type': 'application/json',
  };

  const toolName = 'save_panel_draft';
  const toolDescription = 'Save the interview panel configuration as a draft. The user will see it on screen where they can review and edit before creating. Call this ONLY after the user has confirmed all details are correct.';

  // Point directly to the child platform's save-draft endpoint
  const toolUrl = `${childPlatformUrl}/api/tools/save-draft`;

  console.log(`[elevenlabs] Creating tool with URL: ${toolUrl}`);

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
            tone: { type: 'string', description: 'Interview tone (e.g., professional, friendly, casual)' },
            target_audience: { type: 'string', description: 'Who will be interviewed' },
            duration_minutes: { type: 'number', description: 'Expected interview duration in minutes' },
            agent_name: { type: 'string', description: 'Name for the AI interviewer (optional)' },
            voice_gender: { type: 'string', description: 'Voice gender preference: male or female' },
            closing_message: { type: 'string', description: 'Thank you message at end of interview' },
            greeting: { type: 'string', description: 'Custom opening line for interviews (optional)' },
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

  // Child platform URL from metadata (set by Vercel provisioning step)
  const childPlatformUrl = ctx.metadata.vercelUrl;

  if (!childPlatformUrl) {
    throw new Error('Child platform URL not available - Vercel provisioning must complete first');
  }

  // Webhooks still route through parent for centralized tracking
  const webhookRouterUrl = `${ctx.publicBaseUrl}/api/webhooks/elevenlabs-router`;

  const headers = {
    'xi-api-key': ctx.elevenLabsApiKey,
    'Content-Type': 'application/json',
  };

  console.log(`[elevenlabs] Agent name: ${agentName}`);
  console.log(`[elevenlabs] Child platform URL: ${childPlatformUrl}`);
  console.log(`[elevenlabs] Webhook router URL: ${webhookRouterUrl}`);

  // Check if agent already exists for this platform
  const listRes = await fetch(`${ELEVENLABS_API}/convai/agents`, { headers });

  if (listRes.ok) {
    const data = await listRes.json();
    const existing = data.agents?.find((a: any) => a.name === agentName);

    if (existing) {
      console.log(`[elevenlabs] Found existing agent: ${existing.agent_id}`);

      // Create a new tool pointing to the child platform
      const toolId = await createAgentTool(ctx.elevenLabsApiKey, childPlatformUrl);

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
              first_message: `Hi there! I'm Sandra, and I'm here to help you set up your interview panel for ${ctx.platformName}. This will only take a few minutes. Ready to get started?`,
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
          elevenLabsToolUrl: `${childPlatformUrl}/api/tools/save-draft`,
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
          tool_ids: [], // Will add tool after creation
        },
        first_message: `Hi there! I'm Sandra, and I'm here to help you set up your interview panel for ${ctx.platformName}. This will only take a few minutes. Ready to get started?`,
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

  // Now create the tool pointing to the child platform
  const toolId = await createAgentTool(ctx.elevenLabsApiKey, childPlatformUrl);

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
      elevenLabsToolUrl: `${childPlatformUrl}/api/tools/save-draft`,
      elevenLabsRouterUrl: webhookRouterUrl,
      elevenLabsVerified: true,
    },
  };
}