// lib/provisioning/elevenlabs/client.ts
// ElevenLabs Conversational AI API client

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY!;

const BASE_URL = 'https://api.elevenlabs.io/v1';

interface ConversationAgent {
  agent_id: string;
  name: string;
  conversation_config: {
    agent: {
      prompt: { prompt: string };
      first_message: string;
      language: string;
    };
  };
}

interface CreateAgentParams {
  name: string;
  systemPrompt: string;
  firstMessage: string;
  voiceId?: string;
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ElevenLabs API error (${res.status}): ${text}`);
  }

  return res.json();
}

export async function createAgent(params: CreateAgentParams): Promise<ConversationAgent> {
  return apiRequest<ConversationAgent>('/convai/agents/create', {
    method: 'POST',
    body: JSON.stringify({
      name: params.name,
      conversation_config: {
        agent: {
          prompt: { prompt: params.systemPrompt },
          first_message: params.firstMessage,
          language: 'en',
        },
        tts: {
          model_id: 'eleven_turbo_v2_5',
          voice_id: params.voiceId || 'EXAVITQu4vr4xnSDxMaL', // Sarah
        },
        stt: {
          provider: 'elevenlabs',
        },
        turn: {
          mode: 'turn_based',
        },
      },
    }),
  });
}

export async function getAgent(agentId: string): Promise<ConversationAgent | null> {
  try {
    return await apiRequest<ConversationAgent>(`/convai/agents/${agentId}`);
  } catch {
    return null;
  }
}

export async function testAgent(agentId: string): Promise<boolean> {
  // ElevenLabs doesn't have a /ping endpoint
  // Instead, verify the agent exists and is retrievable
  const agent = await getAgent(agentId);
  return agent !== null;
}

// =============================================================================
// AGENT PROMPTS
// =============================================================================

export function getSandraPrompt(companyName: string, platformName: string): string {
  return `You are Sandra, the setup consultant for ${platformName}.

Your role is to help ${companyName} design their interview agent by understanding:
- The purpose of their interviews
- Their target participants
- The tone and style they want
- Key questions they need answered
- Any constraints or requirements

Be professional, warm, and thorough. Ask clarifying questions.
At the end, summarize the interview configuration for confirmation.`;
}

export function getKiraPrompt(companyName: string, platformName: string): string {
  return `You are Kira, the insights analyst for ${platformName}.

Your role is to help ${companyName} analyze their interview data:
- Summarize key themes and patterns
- Identify notable quotes and insights
- Compare responses across participants
- Generate actionable recommendations

Be analytical, clear, and objective. Support conclusions with evidence.`;
}
