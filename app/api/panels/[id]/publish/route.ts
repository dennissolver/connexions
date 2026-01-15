// app/api/panels/[id]/publish/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get the draft
    const { data: draft, error: fetchError } = await supabase
      .from('panel_drafts')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !draft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }

    if (draft.status === 'published') {
      return NextResponse.json({ error: 'Draft already published' }, { status: 400 });
    }

    // Get any updates from request body (user edits)
    const updates = await request.json().catch(() => ({}));

    const finalConfig = {
      name: updates.name || draft.name,
      description: updates.description || draft.description,
      interview_type: updates.interview_type || draft.interview_type,
      target_audience: updates.target_audience || draft.target_audience,
      tone: updates.tone || draft.tone,
      duration_minutes: updates.duration_minutes || draft.duration_minutes,
      questions: updates.questions || draft.questions,
    };

    // Create ElevenLabs interview agent
    const elevenlabsApiKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenlabsApiKey) {
      return NextResponse.json({ error: 'ELEVENLABS_API_KEY not configured' }, { status: 500 });
    }

    const interviewPrompt = `You are an AI interviewer for "${finalConfig.name}".

## Context
${finalConfig.description || 'Conducting interviews to gather insights.'}

## Your Style
- Tone: ${finalConfig.tone || 'professional yet friendly'}
- Target audience: ${finalConfig.target_audience || 'participants'}
- Interview type: ${finalConfig.interview_type || 'general'}
- Duration: ${finalConfig.duration_minutes || 15} minutes

## Interview Flow
1. Introduce yourself warmly
2. Ask the questions one at a time
3. Listen carefully and ask follow-up questions when appropriate
4. Thank them and wrap up naturally

## Questions to Cover
${(finalConfig.questions || []).map((q: string, i: number) => `${i + 1}. ${q}`).join('\n')}

## Rules
- Be conversational and natural
- ONE question at a time
- Listen actively and acknowledge responses
- Keep responses under 50 words
- Stay on topic but allow natural conversation flow`;

    const greeting = `Hello! Thank you for joining this interview. I'm here to chat with you about ${finalConfig.description || finalConfig.name}. Let's get started!`;

    const agentConfig = {
      name: finalConfig.name,
      conversation_config: {
        agent: {
          prompt: { prompt: interviewPrompt },
          first_message: greeting,
          language: 'en',
        },
        tts: {
          voice_id: 'EXAVITQu4vr4xnSDxMaL', // Sarah (female)
          model_id: 'eleven_flash_v2',
        },
        stt: { provider: 'elevenlabs' },
        turn: { mode: 'turn' },
      },
      platform_settings: {
        webhook: {
          url: process.env.ELEVENLABS_WEBHOOK_URL || `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/elevenlabs`,
          events: ['conversation.transcript', 'conversation.ended'],
        },
      },
    };

    console.log('[publish] Creating ElevenLabs agent:', finalConfig.name);

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
      console.error('[publish] ElevenLabs error:', error);
      return NextResponse.json({
        error: `Failed to create interview agent: ${error.detail?.message || JSON.stringify(error)}`
      }, { status: 400 });
    }

    const agent = await createRes.json();
    console.log('[publish] ElevenLabs agent created:', agent.agent_id);

    // Generate slug
    const slug = finalConfig.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50);

    // Save to agents table
    const { data: panel, error: insertError } = await supabase
      .from('agents')
      .insert({
        name: finalConfig.name,
        slug,
        description: finalConfig.description || '',
        elevenlabs_agent_id: agent.agent_id,
        greeting,
        questions: finalConfig.questions,
        settings: {
          tone: finalConfig.tone,
          duration_minutes: finalConfig.duration_minutes,
          target_audience: finalConfig.target_audience,
          interview_type: finalConfig.interview_type,
        },
        status