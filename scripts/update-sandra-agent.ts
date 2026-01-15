// scripts/update-sandra-agent.ts
// Run with: npx ts-node scripts/update-sandra-agent.ts

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY!;
const SANDRA_AGENT_ID = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID!; // or SANDRA_AGENT_ID
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://connexions.vercel.app';

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
When you have all the information, use the save_panel_draft tool to save it. Then say: "Perfect! I've saved your panel as a draft. You'll see it on your screen now where you can review everything and make any changes before creating your interviewer!"`;

async function updateSandraAgent() {
  console.log('Updating Sandra agent:', SANDRA_AGENT_ID);
  console.log('App URL:', APP_URL);

  const agentConfig = {
    conversation_config: {
      agent: {
        prompt: {
          prompt: SETUP_AGENT_PROMPT
        },
        first_message: "Hello! I'm Sandra, your AI setup assistant. I'll help you create a custom interview panel in just a few minutes. Ready to get started?",
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
      conversation: {
        max_duration_seconds: 3600
      },
    },
    platform_settings: {
      tools: [
        {
          type: 'webhook',
          name: 'save_panel_draft',
          description: 'Save the interview panel configuration as a draft. The user will see it on screen where they can review and edit before creating. Call this when the user has confirmed all the details for their panel.',
          webhook: {
            url: `${APP_URL}/api/tools/save-draft`,
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

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${SANDRA_AGENT_ID}`, {
      method: 'PATCH',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(agentConfig),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Failed to update agent:', error);
      process.exit(1);
    }

    const result = await response.json();
    console.log('✅ Sandra agent updated successfully!');
    console.log('Agent ID:', result.agent_id);
    console.log('Tool URL:', `${APP_URL}/api/tools/save-draft`);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updateSandraAgent();