// app/api/setup/create-elevenlabs/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// -----------------------------------------------------------------------------
// Supabase (service role – setup only)
// -----------------------------------------------------------------------------

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing Supabase credentials');
  }

  return createClient(url, key);
}

// -----------------------------------------------------------------------------
// Prompt template
// -----------------------------------------------------------------------------

const SETUP_AGENT_PROMPT_TEMPLATE = `You are {{AGENT_NAME}}, a warm and curious AI assistant helping people design their perfect interview or survey experience on the {{PLATFORM_NAME}} platform.`;

// -----------------------------------------------------------------------------
// POST – Setup interview agent + persist canonical public URL
// -----------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const platformName =
      body.platformName ||
      body.projectName ||
      body.formData?.platformName;

    const publicBaseUrl =
      typeof body.publicBaseUrl === 'string'
        ? body.publicBaseUrl.replace(/\/$/, '')
        : null;

    if (!platformName || !publicBaseUrl) {
      return NextResponse.json(
        { error: 'platformName and publicBaseUrl are required for setup' },
        { status: 400 }
      );
    }

    const voiceGender =
      body.voiceGender || body.formData?.voiceGender || 'female';

    const agentName =
      body.agentName ||
      body.formData?.agentName ||
      (voiceGender === 'male' ? 'Alex' : 'Sarah');

    const projectSlug =
      body.projectSlug ||
      platformName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 40);

    const elevenlabsApiKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenlabsApiKey) {
      return NextResponse.json(
        { error: 'ELEVENLABS_API_KEY not configured' },
        { status: 500 }
      );
    }

    const supabase = getSupabase();

    // -------------------------------------------------------------------------
    // 1️⃣ Create or update agent record (authoritative setup write)
    // -------------------------------------------------------------------------

    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .upsert(
        {
          slug: projectSlug,
          name: platformName,
          public_base_url: publicBaseUrl,
          status: 'setting_up',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'slug' }
      )
      .select()
      .single();

    if (agentError || !agent) {
      console.error('[Setup] Failed to upsert agent:', agentError);
      return NextResponse.json(
        { error: 'Failed to create agent record' },
        { status: 500 }
      );
    }

    // -------------------------------------------------------------------------
    // 2️⃣ Create ElevenLabs agent
    // -------------------------------------------------------------------------

    const prompt = SETUP_AGENT_PROMPT_TEMPLATE
      .replace(/\{\{AGENT_NAME\}\}/g, agentName)
      .replace(/\{\{PLATFORM_NAME\}\}/g, platformName);

    const voiceId =
      voiceGender === 'male'
        ? 'pNInz6obpgDQGcFmaJgB'
        : 'EXAVITQu4vr4xnSDxMaL';

    const firstMessage =
      `Hi! I'm ${agentName}. I'll help you set up your interview experience.`;

    const createRes = await fetch(
      'https://api.elevenlabs.io/v1/convai/agents/create',
      {
        method: 'POST',
        headers: {
          'xi-api-key': elevenlabsApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `${projectSlug}-setup-agent`,
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
            webhooks: {
              post_call: {
                url: `${publicBaseUrl}/api/webhooks/elevenlabs`,
              },
            },
          },
        }),
      }
    );

    if (!createRes.ok) {
      const text = await createRes.text();
      console.error('[ElevenLabs] Create failed:', text);
      return NextResponse.json(
        { error: 'Failed to create ElevenLabs agent' },
        { status: 400 }
      );
    }

    const elevenlabsAgent = await createRes.json();

    // -------------------------------------------------------------------------
    // 3️⃣ Persist ElevenLabs agent ID + mark ready
    // -------------------------------------------------------------------------

    await supabase
      .from('agents')
      .update({
        elevenlabs_agent_id: elevenlabsAgent.agent_id,
        status: 'ready',
      })
      .eq('id', agent.id);

    return NextResponse.json({
      success: true,
      agentId: agent.id,
      slug: agent.slug,
      public_base_url: publicBaseUrl,
    });

  } catch (error: any) {
    console.error('[Setup] Fatal error:', error);
    return NextResponse.json(
      { error: error.message || 'Setup failed' },
      { status: 500 }
    );
  }
}
