// app/api/setup/create-elevenlabs/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

// ============================================================================
// Prompt template
// ============================================================================

const SETUP_AGENT_PROMPT_TEMPLATE = `You are {{AGENT_NAME}}, a warm and curious AI assistant helping people design their perfect interview or survey experience on the {{PLATFORM_NAME}} platform.

## Your Approach
You're having a genuine conversation to understand what they're trying to achieve. Don't follow a rigid script - listen, ask follow-up questions, and help them clarify their vision.

## Discovery Areas (explore naturally, not as a checklist)
- What's the goal? Understanding the "why" helps you design better questions
- Who are they talking to? (candidates, customers, users, patients, etc.)
- What do they most want to learn or discover?
- What tone fits their brand and audience?
- How much of someone's time can they realistically ask for?

## Automatic Features (mention these when relevant)
- Participant info (name, email, phone, company, location) is collected automatically
- Email notifications are sent on interview completion
- Full transcripts and AI summaries are available in the dashboard

## Conversation Style
- Be genuinely curious
- Mirror their energy
- Offer suggestions when helpful
- Keep responses under 40 words
- ONE question at a time

## Wrapping Up
"So let me make sure I've got this right... [summary]. Does that capture it?"`;


// ============================================================================
// POST – Create / reuse ElevenLabs setup agent
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const platformName =
      body.platformName ||
      body.projectName ||
      body.formData?.platformName;

    if (!platformName) {
      return NextResponse.json(
        { error: 'Platform name required' },
        { status: 400 }
      );
    }

    const projectSlug =
      body.projectSlug ||
      body.slug ||
      platformName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 40);

    const voiceGender =
      body.voiceGender ||
      body.formData?.voiceGender ||
      'female';

    const agentName =
      body.agentName ||
      body.formData?.agentName ||
      (voiceGender === 'male' ? 'Alex' : 'Sarah');

    const webhookUrl =
      typeof body.webhookUrl === 'string'
        ? body.webhookUrl.replace(/\/$/, '')
        : '';

    const elevenlabsApiKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenlabsApiKey) {
      return NextResponse.json(
        { error: 'ELEVENLABS_API_KEY not configured' },
        { status: 500 }
      );
    }

    const agentDisplayName = `${projectSlug}-setup-agent`;

    const prompt = SETUP_AGENT_PROMPT_TEMPLATE
      .replace(/\{\{AGENT_NAME\}\}/g, agentName)
      .replace(/\{\{PLATFORM_NAME\}\}/g, platformName);

    // ------------------------------------------------------------------------
    // Check for existing agent
    // ------------------------------------------------------------------------

    const listRes = await fetch(
      'https://api.elevenlabs.io/v1/convai/agents',
      { headers: { 'xi-api-key': elevenlabsApiKey } }
    );

    if (listRes.ok) {
      const data = await listRes.json();
      const existing = data?.agents?.find(
        (a: any) => a.name === agentDisplayName
      );

      if (existing) {
        return NextResponse.json({
          success: true,
          agentId: existing.agent_id,
          agentName: existing.name,
          alreadyExists: true,
        });
      }
    }

    // ------------------------------------------------------------------------
    // Create agent
    // ------------------------------------------------------------------------

    const voiceId =
      voiceGender === 'male'
        ? 'pNInz6obpgDQGcFmaJgB'
        : 'EXAVITQu4vr4xnSDxMaL';

    const firstMessage =
      `Hi there! I'm ${agentName}, and I'll help you set up your interview experience. What are you looking to run?`;

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

    if (webhookUrl) {
      agentConfig.conversation_config.webhooks = {
        post_call: { url: webhookUrl },
      };
    }

    const createRes = await fetch(
      'https://api.elevenlabs.io/v1/convai/agents/create',
      {
        method: 'POST',
        headers: {
          'xi-api-key': elevenlabsApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(agentConfig),
      }
    );

    if (!createRes.ok) {
      const text = await createRes.text();
      console.error('[ElevenLabs] Create failed:', text);
      return NextResponse.json(
        { error: 'Failed to create agent', detail: text },
        { status: 400 }
      );
    }

    const agent = await createRes.json();

    return NextResponse.json({
      success: true,
      agentId: agent.agent_id,
      agentName: agent.name || agentDisplayName,
      voiceName: agentName,
    });

  } catch (error: any) {
    console.error('[Create ElevenLabs] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create ElevenLabs agent' },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE – Remove ElevenLabs agent
// ============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const { agentId } = await request.json();

    if (!agentId) {
      return NextResponse.json(
        { error: 'Agent ID required' },
        { status: 400 }
      );
    }

    const elevenlabsApiKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenlabsApiKey) {
      return NextResponse.json(
        { error: 'ELEVENLABS_API_KEY not configured' },
        { status: 500 }
      );
    }

    const deleteRes = await fetch(
      `https://api.elevenlabs.io/v1/convai/agents/${agentId}`,
      {
        method: 'DELETE',
        headers: { 'xi-api-key': elevenlabsApiKey },
      }
    );

    if (!deleteRes.ok && deleteRes.status !== 404) {
      const text = await deleteRes.text();
      console.error('[ElevenLabs] Delete failed:', text);
      return NextResponse.json(
        { error: 'Failed to delete agent' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('[Delete ElevenLabs] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Delete failed' },
      { status: 500 }
    );
  }
}
