// app/api/setup/create-elevenlabs/route.ts
import { NextRequest, NextResponse } from 'next/server';

const SETUP_AGENT_PROMPT = `You are Sandra, a friendly AI Setup Agent for the Connexions AI Interview Platform. Your goal is to gather information from the user to create their custom AI interviewer.

## Ask these questions conversationally (one at a time):
1. What name do you want for your Interview session?
2. What type of interviews do you want to conduct? (job interviews, customer research, surveys, etc.)
3. Who will be interviewed? (job candidates, customers, users, etc.)
4. What tone should the interviewer have? (professional, casual, friendly, formal)
5. How long should interviews typically last? (5 mins, 10 mins, 15 mins, etc.)
6. What are 3-5 key questions or topics the interviewer should cover?

## Rules
- Be conversational and natural
- ONE question at a time
- Under 30 words per response
- Confirm understanding after each answer
- Keep the conversation under 10 minutes

## Wrap Up
When you have all the information, summarize what you'll create and thank them.
Say: "Perfect! I've got everything I need. Check your screen for the summary!"`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Accept multiple parameter formats
    const platformName = body.platformName || body.projectName || body.formData?.platformName;
    const companyName = body.companyName || body.formData?.companyName || platformName;
    const voiceGender = body.voiceGender || body.formData?.voiceGender || 'female';
    const webhookUrl = body.webhookUrl || '';

    const elevenlabsApiKey = process.env.ELEVENLABS_API_KEY;

    if (!elevenlabsApiKey) {
      return NextResponse.json({ error: 'ELEVENLABS_API_KEY not configured' }, { status: 500 });
    }

    if (!platformName) {
      return NextResponse.json({ error: 'Platform name required' }, { status: 400 });
    }

    const agentDisplayName = `${companyName || platformName} Setup Agent`;

    // Check for existing agent
    console.log('Checking for existing ElevenLabs agent:', agentDisplayName);
    
    const listRes = await fetch('https://api.elevenlabs.io/v1/convai/agents', {
      headers: { 'xi-api-key': elevenlabsApiKey },
    });

    if (listRes.ok) {
      const data = await listRes.json();
      const existing = data.agents?.find((a: any) => a.name === agentDisplayName);
      
      if (existing) {
        console.log('Found existing agent:', existing.agent_id);
        return NextResponse.json({
          success: true,
          agentId: existing.agent_id,
          agentName: existing.name,
          alreadyExists: true,
        });
      }
    }

    // Select voice based on gender
    const voiceId = voiceGender === 'male' ? 'pNInz6obpgDQGcFmaJgB' : 'EXAVITQu4vr4xnSDxMaL';

    console.log('Creating ElevenLabs agent:', agentDisplayName);

    // Build agent config - using eleven_flash_v2 for English
    const agentConfig: any = {
      name: agentDisplayName,
      conversation_config: {
        agent: {
          prompt: { prompt: SETUP_AGENT_PROMPT },
          first_message: "Hello! I'm Sandra, your Connexions AI Interview Platform setup assistant. How can we help you today?",
          language: 'en',
        },
        tts: {
          voice_id: voiceId,
          model_id: 'eleven_flash_v2',
        },
        stt: { provider: 'elevenlabs' },
        turn: { mode: 'turn' },
      },
    };

    // Add webhook if provided
    if (webhookUrl) {
      agentConfig.conversation_config.webhooks = {
        post_call: { url: webhookUrl },
      };
    }

    const createRes = await fetch('https://api.elevenlabs.io/v1/convai/agents/create', {
      method: 'POST',
      headers: {
        'xi-api-key': elevenlabsApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(agentConfig),
    });

    if (!createRes.ok) {
      const error = await createRes.json();
      console.error('ElevenLabs creation failed:', error);
      return NextResponse.json(
        { error: error.detail?.message || error.detail || JSON.stringify(error) },
        { status: 400 }
      );
    }

    const agent = await createRes.json();
    console.log('ElevenLabs agent created:', agent.agent_id);

    return NextResponse.json({
      success: true,
      agentId: agent.agent_id,
      agentName: agent.name || agentDisplayName,
    });

  } catch (error: any) {
    console.error('Create ElevenLabs error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create ElevenLabs agent' },
      { status: 500 }
    );
  }
}