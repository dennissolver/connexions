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

export async function createElevenLabsAgent(ctx: ProvisionContext): Promise<ProvisionStepResult> {
  // Skip if already created
  if (ctx.metadata.elevenLabsAgentId) {
    return { nextState: 'WEBHOOK_REGISTERING', metadata: ctx.metadata };
  }

  const agentName = `${ctx.companyName || ctx.platformName} Setup Agent`;
  const headers = {
    'xi-api-key': ctx.elevenLabsApiKey,
    'Content-Type': 'application/json',
  };

  // Check if agent already exists
  const listRes = await fetch(`${ELEVENLABS_API}/convai/agents`, { headers });
  if (listRes.ok) {
    const data = await listRes.json();
    const existing = data.agents?.find((a: any) => a.name === agentName);
    if (existing) {
      console.log(`[elevenlabs] Found existing agent: ${existing.agent_id}`);
      return {
        nextState: 'WEBHOOK_REGISTERING',
        metadata: {
          ...ctx.metadata,
          elevenLabsAgentId: existing.agent_id,
          elevenLabsAgentName: existing.name
        },
      };
    }
  }

  // Create the agent with tools
  const childPlatformUrl = ctx.metadata.vercelUrl || `https://${ctx.projectSlug}.vercel.app`;

  const agentConfig = {
    name: agentName,
    conversation_config: {
      agent: {
        prompt: {
          prompt: SETUP_AGENT_PROMPT.replace(/\{platformName\}/g, ctx.platformName)
        },
        first_message: `Hello! I'm Sandra, your AI setup assistant for ${ctx.platformName}. I'll help you create a custom interview panel. Ready to get started?`,
        language: 'en',
      },
      tts: {
        voice_id: 'EXAVITQu4vr4xnSDxMaL', // Sarah voice
        model_id: 'eleven_flash_v2'
      },
      stt: {
        provider: 'elevenlabs'
      },
      turn: {
        mode: 'turn'
      },
    },
    platform_settings: {
      tools: [
        {
          type: 'webhook',
          name: 'save_panel_draft',
          description: 'Save the interview panel configuration as a draft. The user will see it on screen where they can review and edit before creating. Call this when the user has confirmed all details.',
          webhook: {
            url: `${childPlatformUrl}/api/tools/save-draft`,
            method: 'POST',
          },
          parameters: {
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
                items: { type: 'string' },
                description: 'List of key questions or topics to cover',
              },
            },
            required: ['name', 'description', 'questions'],
          },
        },
      ],
    },
  };

  console.log(`[elevenlabs] Creating agent: ${agentName}`);
  console.log(`[elevenlabs] Tool URL: ${childPlatformUrl}/api/tools/save-draft`);

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

  return {
    nextState: 'WEBHOOK_REGISTERING',
    metadata: {
      ...ctx.metadata,
      elevenLabsAgentId: agent.agent_id,
      elevenLabsAgentName: agentName
    },
  };
}