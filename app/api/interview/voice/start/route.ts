// app/api/interview/voice/start/route.ts.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId, elevenLabsAgentId } = body;

    if (!agentId || !elevenLabsAgentId) {
      return NextResponse.json(
        { error: 'Agent ID and ElevenLabs Agent ID required' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Create interview record
    const { data: interview, error: interviewError } = await supabase
      .from('interviews')
      .insert({
        agent_id: agentId,
        status: 'in_progress',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (interviewError) {
      console.error('Failed to create interview:', interviewError);
      return NextResponse.json(
        { error: 'Failed to create interview record' },
        { status: 500 }
      );
    }

    // Get signed URL from ElevenLabs
    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
    
    if (!elevenLabsApiKey) {
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured' },
        { status: 500 }
      );
    }

    const signedUrlResponse = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${elevenLabsAgentId}`,
      {
        method: 'GET',
        headers: {
          'xi-api-key': elevenLabsApiKey,
        },
      }
    );

    if (!signedUrlResponse.ok) {
      const errorText = await signedUrlResponse.text();
      console.error('ElevenLabs signed URL error:', errorText);
      return NextResponse.json(
        { error: 'Failed to get conversation URL' },
        { status: 500 }
      );
    }

    const { signed_url: signedUrl } = await signedUrlResponse.json();

    return NextResponse.json({
      success: true,
      interviewId: interview.id,
      elevenLabsAgentId,
      signedUrl,
    });
  } catch (error) {
    console.error('Voice start error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

