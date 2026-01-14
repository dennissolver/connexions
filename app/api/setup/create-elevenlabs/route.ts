// app/api/setup/create-elevenlabs/route.ts
import { NextRequest, NextResponse } from 'next/server';

// Template with placeholders - {{AGENT_NAME}} and {{PLATFORM_NAME}} get replaced
const SETUP_AGENT_PROMPT_TEMPLATE = `You are {{AGENT_NAME}}, a warm and curious AI assistant helping people design their perfect interview or survey experience on the {{PLATFORM_NAME}} platform.

## Your Approach
You're having a genuine conversation to understand what they're trying to achieve. Don't follow a rigid script - listen, ask follow-up questions, and help them clarify their vision.

## Discovery Areas (explore naturally, not as a checklist)
- What's the goal? Understanding the "why" helps you design better questions
- Who are they talking to? (candidates, customers, users, patients, etc.)
- What do they most want to learn or discover?
- What tone fits their brand and audience?
- How much of someone's time can they realistically ask for?

## Conversation Style
- Be genuinely curious - ask "tell me more about that" when something's interesting
- Mirror their energy - if they're casual, be casual; if formal, match that
- Offer suggestions when helpful: "Some clients in your space find it useful to ask about..."
- Keep responses concise (under 40 words) but warm
- ONE question or thought at a time

## Helpful Prompts When They're Stuck
- "What would success look like after running these interviews?"
- "If you could only ask three questions, what would matter most?"
- "What do you wish you knew about your [customers/candidates/users]?"

## Wrapping Up
When you have a clear picture, summarize it back conversationally:
"So let me make sure I've got this right... [summary]. Does that capture it?"

Then say: "Perfect! I've got everything I need to create this for you. Check your screen for the summary!"`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Accept multiple parameter formats
    const platformName = body.platformName || body.projectName || body.formData?.platformName;
    const companyName = body.companyName || body.formData?.companyName || platformName;
    const voiceGender = body.voiceGender || body.formData?.voiceGender || 'female';
    const agentName = body.agentName || body.formData?.agentName || (voiceGender === 'male' ? 'Alex' : 'Sarah');
    const webhookUrl = body.webhookUrl || '';

    const elevenlabsApiKey = process.env.ELEVENLABS_API_KEY;

    if (!elevenlabsApiKey) {
      return NextResponse.json({ error: 'ELEVENLABS_API_KEY not configured' }, { status: 500 });
    }

    if (!platformName) {
      return NextResponse.json({ error: 'Platform name required' }, { status: 400 });
    }

    const agentDisplayName = `${companyName || platformName} Setup Agent`;

    // Replace placeholders in prompt
    const prompt = SETUP_AGENT_PROMPT_TEMPLATE
      .replace(/\{\{AGENT_NAME\}\}/g, agentName)
      .replace(/\{\{PLATFORM_NAME\}\}/g, platformName);

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
    // Female: Sarah (EXAVITQu4vr4xnSDxMaL), Male: Adam (pNInz6obpgDQGcFmaJgB)
    const voiceId = voiceGender === 'male' ? 'pNInz6obpgDQGcFmaJgB' : 'EXAVITQu4vr4xnSDxMaL';

    console.log('Creating ElevenLabs agent:', agentDisplayName, '| Voice:', agentName, '| Gender:', voiceGender);

    // Build first message with agent name
    const firstMessage = `Hi there! I'm ${agentName}, and I'll be helping you set up your interview experience today. What kind of interviews or surveys are you looking to run?`;

    // Build agent config
    const agentConfig: any = {
      name: agentDisplayName,
      conversation_config: {
        agent: {
          prompt: { prompt },
          first_message: firstMessage,
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
      voiceName: agentName,
    });

  } catch (error: any) {
    console.error('Create ElevenLabs error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create ElevenLabs agent' },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE - Remove ElevenLabs agent
// ============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const { agentId } = await request.json();

    if (!agentId) {
      return NextResponse.json({ error: 'Agent ID required' }, { status: 400 });
    }

    const elevenlabsApiKey = process.env.ELEVENLABS_API_KEY;

    if (!elevenlabsApiKey) {
      return NextResponse.json({ error: 'ELEVENLABS_API_KEY not configured' }, { status: 500 });
    }

    console.log('[Cleanup] Deleting ElevenLabs agent:', agentId);

    // Check if agent exists
    const checkRes = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
      headers: { 'xi-api-key': elevenlabsApiKey },
    });

    if (!checkRes.ok) {
      console.log('[Cleanup] ElevenLabs agent not found:', agentId);
      return NextResponse.json({ success: true, alreadyDeleted: true });
    }

    // Delete the agent
    const deleteRes = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
      method: 'DELETE',
      headers: { 'xi-api-key': elevenlabsApiKey },
    });

    if (!deleteRes.ok && deleteRes.status !== 404) {
      const error = await deleteRes.json().catch(() => ({}));
      console.error('[Cleanup] Failed to delete ElevenLabs agent:', error);
      return NextResponse.json({ error: 'Failed to delete agent' }, { status: 400 });
    }

    console.log('[Cleanup] ElevenLabs agent deleted:', agentId);
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('[Cleanup] ElevenLabs delete error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}