// app/api/get-transcript/route.ts.ts
// Retrieves transcript from ElevenLabs conversation or our DB

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering - this route.ts uses request.url
export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    if (!conversationId) {
      return NextResponse.json(
        { error: 'conversationId required' },
        { status: 400 }
      );
    }

    // First check our database (setup_sessions)
    const { data: session } = await supabase
      .from('setup_sessions')
      .select('transcript, messages')
      .eq('conversation_id', conversationId)
      .single();

    if (session?.transcript) {
      return NextResponse.json({
        transcript: session.transcript,
        source: 'database'
      });
    }

    // If not in DB, try to fetch from ElevenLabs
    const elevenlabsApiKey = process.env.ELEVENLABS_API_KEY;

    if (elevenlabsApiKey) {
      try {
        const response = await fetch(
          `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`,
          {
            headers: {
              'xi-api-key': elevenlabsApiKey,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();

          // Format transcript from messages
          let transcript = '';
          if (data.transcript) {
            transcript = data.transcript;
          } else if (data.messages && Array.isArray(data.messages)) {
            transcript = data.messages
              .map((m: any) => `${m.role === 'agent' ? 'Agent' : 'User'}: ${m.content || m.text || ''}`)
              .join('\n\n');
          }

          // Store in our database for future reference
          if (transcript) {
            await supabase
              .from('setup_sessions')
              .upsert({
                conversation_id: conversationId,
                transcript,
                messages: data.messages || [],
                status: 'completed',
                completed_at: new Date().toISOString(),
              }, {
                onConflict: 'conversation_id'
              });
          }

          return NextResponse.json({
            transcript,
            source: 'elevenlabs'
          });
        }
      } catch (err) {
        console.error('ElevenLabs fetch error:', err);
      }
    }

    // Also check interviews table
    const { data: interview } = await supabase
      .from('interviews')
      .select('transcript, messages')
      .eq('conversation_id', conversationId)
      .single();

    if (interview?.transcript) {
      return NextResponse.json({
        transcript: interview.transcript,
        source: 'interviews'
      });
    }

    if (interview?.messages && Array.isArray(interview.messages)) {
      const transcript = interview.messages
        .map((m: any) => `${m.role === 'agent' ? 'Agent' : 'Interviewee'}: ${m.content}`)
        .join('\n\n');

      return NextResponse.json({
        transcript,
        source: 'interviews_messages'
      });
    }

    return NextResponse.json(
      { error: 'Transcript not found' },
      { status: 404 }
    );

  } catch (error: any) {
    console.error('Get transcript error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get transcript' },
      { status: 500 }
    );
  }
}

