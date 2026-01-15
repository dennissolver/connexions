// app/api/create-agent/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[create-agent] Request:', JSON.stringify(body, null, 2));

    const {
      // From confirm page
      company_name,
      contact_name,
      company_email,
      agent_name,
      agent_role,
      interview_purpose,
      target_audience,
      interview_style,
      tone,
      duration_minutes,
      key_topics,
      key_questions,
      voice_gender,
      constraints,
      notification_email,
      // From create page (AgentConfig format)
      clientName,
      companyName,
      interviewPurpose,
      targetAudience,
      interviewStyle,
      keyTopics,
      keyQuestions,
      summary,
    } = body;

    // Normalize fields - support both confirm page and create page formats
    const name = agent_name || clientName || company_name || 'Interview Panel';
    const description = interview_purpose || interviewPurpose || summary || '';
    const audience = target_audience || targetAudience || '';
    const style = interview_style || interviewStyle || 'conversational';
    const questions = key_questions || keyQuestions || [];
    const topics = key_topics || keyTopics || [];
    const duration = duration_minutes || 15;
    const toneValue = tone || 'professional';
    const voiceId = voice_gender === 'male'
      ? 'pNInz6obpgDQGcFmaJgB' // Adam
      : 'EXAVITQu4vr4xnSDxMaL'; // Sarah (female)

    // Build the interview prompt
    const interviewPrompt = `You are ${name}, an AI interviewer${agent_role ? ` working as a ${agent_role}` : ''}.

## Context
${description}

## Your Style
- Tone: ${toneValue}
- Target audience: ${audience}
- Interview style: ${style}
- Duration: approximately ${duration} minutes

## Topics to Cover
${topics.map((t: string, i: number) => `${i + 1}. ${t}`).join('\n') || 'General discussion based on the interview purpose'}

## Questions to Ask
${questions.map((q: string, i: number) => `${i + 1}. ${q}`).join('\n') || 'Ask open-ended questions relevant to the interview purpose'}

${constraints ? `## Topics to Avoid\n${constraints}` : ''}

## Interview Guidelines
- Be conversational and natural
- Ask ONE question at a time
- Listen carefully and acknowledge responses before moving on
- Ask follow-up questions when appropriate
- Keep your responses concise (under 50 words)
- Guide the conversation but allow natural flow
- Thank the participant at the end`;

    const greeting = `Hello! Thank you for joining this interview${company_name ? ` for ${company_name}` : ''}. I'm ${name}, and I'll be speaking with you today about ${description || 'a few important topics'}. Let's get started!`;

    // Create ElevenLabs agent
    const elevenlabsApiKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenlabsApiKey) {
      return NextResponse.json({ error: 'ELEVENLABS_API_KEY not configured' }, { status: 500 });
    }

    const agentConfig = {
      name: name,
      conversation_config: {
        agent: {
          prompt: { prompt: interviewPrompt },
          first_message: greeting,
          language: 'en',
        },
        tts: {
          voice_id: voiceId,
          model_id: 'eleven_turbo_v2_5',
        },
        stt: {
          provider: 'elevenlabs',
        },
        turn: {
          mode: 'turn_based',
        },
      },
      platform_settings: {
        webhook: {
          url: process.env.ELEVENLABS_WEBHOOK_URL || `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/elevenlabs`,
          events: ['conversation.transcript', 'conversation.ended'],
        },
      },
    };

    console.log('[create-agent] Creating ElevenLabs agent:', name);

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
      console.error('[create-agent] ElevenLabs error:', error);
      return NextResponse.json(
        { error: `Failed to create agent: ${error.detail?.message || JSON.stringify(error)}` },
        { status: 400 }
      );
    }

    const agent = await createRes.json();
    console.log('[create-agent] ElevenLabs agent created:', agent.agent_id);

    // Generate slug
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50);

    // Save to Supabase
    const { data: panel, error: dbError } = await supabase
      .from('agents')
      .insert({
        name: name,
        slug: slug,
        description: description,
        elevenlabs_agent_id: agent.agent_id,
        greeting: greeting,
        questions: questions,
        settings: {
          tone: toneValue,
          duration_minutes: duration,
          target_audience: audience,
          interview_style: style,
          key_topics: topics,
          voice_gender: voice_gender || 'female',
          constraints: constraints,
          notification_email: notification_email || company_email,
          company_name: company_name || companyName,
          contact_name: contact_name || clientName,
        },
        status: 'active',
      })
      .select()
      .single();

    if (dbError) {
      console.error('[create-agent] Supabase error:', dbError);
      // Don't fail completely - the ElevenLabs agent was created
      return NextResponse.json({
        success: true,
        agentId: agent.agent_id,
        slug: slug,
        warning: `Agent created but database save failed: ${dbError.message}`,
      });
    }

    console.log('[create-agent] Saved to Supabase:', panel.id);

    return NextResponse.json({
      success: true,
      agentId: agent.agent_id,
      panelId: panel.id,
      slug: slug,
      interviewUrl: `/i/${panel.id}`,
    });

  } catch (error: any) {
    console.error('[create-agent] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create agent' },
      { status: 500 }
    );
  }
}