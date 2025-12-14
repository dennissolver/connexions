// app/api/webhooks/elevenlabs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    
    console.log('ElevenLabs webhook received:', payload.type);

    const { type, data } = payload;

    switch (type) {
      case 'conversation.started':
        await handleConversationStarted(data);
        break;

      case 'conversation.ended':
        await handleConversationEnded(data);
        break;

      case 'conversation.transcript':
        await handleTranscript(data);
        break;

      default:
        console.log('Unknown webhook type:', type);
    }

    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

async function handleConversationStarted(data: any) {
  const { conversation_id, agent_id } = data;

  // Find the agent by ElevenLabs agent ID
  const { data: agent } = await supabase
    .from('agents')
    .select('id')
    .eq('elevenlabs_agent_id', agent_id)
    .single();

  if (!agent) {
    console.log('Agent not found for:', agent_id);
    return;
  }

  // Create interview record
  const { data: interview, error } = await supabase
    .from('interviews')
    .insert({
      agent_id: agent.id,
      conversation_id,
      status: 'in_progress',
      source: 'voice',
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create interview:', error);
    return;
  }

  // Increment agent's total interviews
  await supabase.rpc('increment_agent_interviews', { agent_uuid: agent.id });

  console.log('Interview started:', interview.id);
}

async function handleConversationEnded(data: any) {
  const { conversation_id, duration_seconds, transcript, summary } = data;

  // Find the interview by conversation ID
  const { data: interview } = await supabase
    .from('interviews')
    .select('id, agent_id')
    .eq('conversation_id', conversation_id)
    .single();

  if (!interview) {
    console.log('Interview not found for conversation:', conversation_id);
    return;
  }

  // Format transcript if it's an array of messages
  let transcriptText = '';
  let messages: any[] = [];

  if (Array.isArray(transcript)) {
    messages = transcript;
    transcriptText = transcript
      .map((m: any) => `${m.role === 'agent' ? 'Agent' : 'Interviewee'}: ${m.content}`)
      .join('\n\n');
  } else if (typeof transcript === 'string') {
    transcriptText = transcript;
  }

  // Update interview record
  const { error } = await supabase
    .from('interviews')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      duration_seconds,
      transcript: transcriptText,
      messages,
      summary: summary || null,
    })
    .eq('id', interview.id);

  if (error) {
    console.error('Failed to update interview:', error);
    return;
  }

  // Store transcript in storage bucket
  if (transcriptText) {
    await storeTranscript(interview.id, transcriptText);
  }

  // Increment completed interviews
  await supabase.rpc('increment_agent_completed_interviews', { agent_uuid: interview.agent_id });

  console.log('Interview completed:', interview.id);
}

async function handleTranscript(data: any) {
  const { conversation_id, transcript } = data;

  // Find the interview
  const { data: interview } = await supabase
    .from('interviews')
    .select('id')
    .eq('conversation_id', conversation_id)
    .single();

  if (!interview) {
    console.log('Interview not found for transcript update');
    return;
  }

  // Format and store transcript
  let transcriptText = '';
  let messages: any[] = [];

  if (Array.isArray(transcript)) {
    messages = transcript;
    transcriptText = transcript
      .map((m: any) => `${m.role === 'agent' ? 'Agent' : 'Interviewee'}: ${m.content}`)
      .join('\n\n');
  } else if (typeof transcript === 'string') {
    transcriptText = transcript;
  }

  await supabase
    .from('interviews')
    .update({
      transcript: transcriptText,
      messages,
    })
    .eq('id', interview.id);

  console.log('Transcript updated for interview:', interview.id);
}

async function storeTranscript(interviewId: string, transcript: string) {
  try {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${interviewId}/${timestamp}-transcript.txt`;

    const { error } = await supabase.storage
      .from('transcripts')
      .upload(filename, transcript, {
        contentType: 'text/plain',
        upsert: true,
      });

    if (error) {
      console.error('Failed to store transcript:', error);
      return;
    }

    // Get signed URL and update interview
    const { data: urlData } = await supabase.storage
      .from('transcripts')
      .createSignedUrl(filename, 60 * 60 * 24 * 365); // 1 year expiry

    if (urlData?.signedUrl) {
      await supabase
        .from('interviews')
        .update({ transcript_url: urlData.signedUrl })
        .eq('id', interviewId);
    }

    console.log('Transcript stored:', filename);
  } catch (err) {
    console.error('Store transcript error:', err);
  }
}

// Verify webhook signature (if ElevenLabs provides one)
function verifyWebhookSignature(request: NextRequest, payload: string): boolean {
  const signature = request.headers.get('x-elevenlabs-signature');
  const webhookSecret = process.env.ELEVENLABS_WEBHOOK_SECRET;

  if (!webhookSecret || !signature) {
    // If no secret configured, accept all webhooks (for development)
    return true;
  }

  // TODO: Implement signature verification when ElevenLabs provides documentation
  return true;
}
