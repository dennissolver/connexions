// app/api/demo/parse-and-create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function POST(req: NextRequest) {
  let leadId: string | undefined;
  
  try {
    const body = await req.json();
    leadId = body.leadId;

    const { data: lead, error } = await supabase
      .from('demo_leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (error || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    await supabase.from('demo_leads').update({ status: 'parsing' }).eq('id', leadId);

    console.log('Parsing setup transcript...');
    
    const parseResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `Parse this setup conversation and extract the interview specification.

TRANSCRIPT:
${lead.setup_transcript || 'No transcript available'}

LEAD INFO:
- Name: ${lead.name}
- Company: ${lead.company}
- Email: ${lead.email}
- Website: ${lead.website || 'Not provided'}

Return a JSON object with:
{
  "interview_name": "Name for this interview",
  "interview_purpose": "What they want to learn",
  "target_audience": "Who will be interviewed",
  "tone": "professional|friendly|casual",
  "estimated_duration_mins": number,
  "key_topics": ["topic1", "topic2"],
  "key_questions": ["question1", "question2"],
  "constraints": ["things to avoid"],
  "first_message": "How the interviewer should greet"
}

Return ONLY the JSON, no other text.`
      }],
    });

    const responseText = parseResponse.content[0].type === 'text' ? parseResponse.content[0].text : '';
    
    let interviewSpec;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      interviewSpec = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      interviewSpec = {
        interview_name: `${lead.company} Interview`,
        interview_purpose: 'General feedback collection',
        target_audience: 'Customers',
        tone: 'professional',
        estimated_duration_mins: 10,
        key_topics: ['General feedback'],
        key_questions: ['How has your experience been?'],
        constraints: [],
        first_message: `Hi! Thanks for joining this interview for ${lead.company}. Ready to begin?`
      };
    }

    await supabase.from('demo_leads').update({ interview_spec: interviewSpec, status: 'creating_trial' }).eq('id', leadId);

    console.log('Creating trial interview agent...');

    const agentPrompt = `You are an AI interviewer for ${lead.company}.

PURPOSE: ${interviewSpec.interview_purpose}
TARGET AUDIENCE: ${interviewSpec.target_audience}
TONE: ${interviewSpec.tone}

KEY TOPICS:
${interviewSpec.key_topics?.map((t: string) => `- ${t}`).join('\n') || '- General feedback'}

KEY QUESTIONS:
${interviewSpec.key_questions?.map((q: string) => `- ${q}`).join('\n') || '- How has your experience been?'}

RULES:
- Ask ONE question at a time
- Keep responses under 50 words
- Be ${interviewSpec.tone} in tone
- Thank them and end when all topics covered
- Duration target: ${interviewSpec.estimated_duration_mins || 10} minutes`;

    const elevenlabsRes = await fetch('https://api.elevenlabs.io/v1/convai/agents/create', {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `Trial: ${interviewSpec.interview_name || lead.company}`,
        conversation_config: {
          agent: {
            prompt: { prompt: agentPrompt },
            first_message: interviewSpec.first_message,
            language: 'en',
          },
          tts: { voice_id: 'EXAVITQu4vr4xnSDxMaL', model_id: 'eleven_turbo_v2_5' },
          stt: { provider: 'elevenlabs' },
          turn: { mode: 'turn_based' },
        },
        platform_settings: {
          webhook: {
            url: `${process.env.NEXT_PUBLIC_APP_URL}/api/demo/webhook`,
            events: ['conversation.ended', 'conversation.transcript'],
          },
        },
      }),
    });

    if (!elevenlabsRes.ok) {
      throw new Error('Failed to create trial agent');
    }

    const trialAgent = await elevenlabsRes.json();

    await supabase.from('demo_leads').update({ trial_agent_id: trialAgent.agent_id, status: 'trial_ready' }).eq('id', leadId);

    console.log('Trial agent created:', trialAgent.agent_id);

    return NextResponse.json({ success: true, trialAgentId: trialAgent.agent_id, interviewSpec });

  } catch (error: any) {
    console.error('Parse and create error:', error);
    if (leadId) {
      await supabase.from('demo_leads').update({ status: 'error', error_message: error.message }).eq('id', leadId);
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
