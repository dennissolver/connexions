// lib/provisioning/steps/elevenlabs.ts

import { ProvisionContext, ProvisionStepResult } from '../types';

const ELEVENLABS_API = 'https://api.elevenlabs.io/v1';

const SETUP_AGENT_PROMPT = `You are Sandra, a friendly AI Setup Agent for the Connexions AI Interview Platform. Your goal is to gather information from the user to create their custom AI interviewer.

## Ask these questions conversationally (one at a time):
1. What name do you want for your Interview session?
2. What type of interviews do you want to conduct?
3. Who will be interviewed?
4. What tone should the interviewer have?
5. How long should interviews typically last?
6. What are 3-5 key questions or topics the interviewer should cover?

## Rules
- Be conversational and natural
- ONE question at a time
- Under 30 words per response

## Wrap Up
When you have all the information, summarize and say: "Perfect! I've got everything I need. Check your screen for the summary!"`;

export async function createElevenLabsAgent(ctx: ProvisionContext): Promise<ProvisionStepResult> {
  if (ctx.metadata.elevenLabsAgentId) {
    return { nextState: 'WEBHOOK_REGISTERING', metadata: ctx.metadata };
  }

  const agentName = `${ctx.companyName || ctx.platformName} Setup Agent`;

  // Check existing
  const listRes = await fetch(`${ELEVENLABS_API}/convai/agents`, {
    headers: { 'xi-api-key': ctx.elevenLabsApiKey },
  });

  if (listRes.ok) {
    const data = await listRes.json();
    const existing = data.agents?.find((a: any) => a.name === agentName);
    if (existing) {
      return {
        nextState: 'WEBHOOK_REGISTERING',
        metadata: { ...ctx.metadata, elevenLabsAgentId: existing.agent_id, elevenLabsAgentName: existing.name },
      };
    }
  }

  // Create agent
  const createRes = await fetch(`${ELEVENLABS_API}/convai/agents/create`, {
    method: 'POST',
    headers: { 'xi-api-key': ctx.elevenLabsApiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: agentName,
      conversation_config: {
        agent: {
          prompt: { prompt: SETUP_AGENT_PROMPT },
          first_message: `Hello! I'm Sandra, your ${ctx.platformName} setup assistant. Ready to get started?`,
          language: 'en',
        },
        tts: { voice_id: 'EXAVITQu4vr4xnSDxMaL', model_id: 'eleven_flash_v2' },
        stt: { provider: 'elevenlabs' },
        turn: { mode: 'turn' },
        webhooks: { post_call: { url: `${ctx.metadata.vercelUrl}/api/webhooks/elevenlabs` } },
      },
    }),
  });

  if (!createRes.ok) throw new Error(`ElevenLabs create failed: ${await createRes.text()}`);
  const agent = await createRes.json();

  return {
    nextState: 'WEBHOOK_REGISTERING',
    metadata: { ...ctx.metadata, elevenLabsAgentId: agent.agent_id, elevenLabsAgentName: agentName },
  };
}
