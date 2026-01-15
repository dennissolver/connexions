// app/api/setup-agent/voice/start/route.ts
import { NextRequest, NextResponse } from 'next/server';

// Sandra's agent ID (preset in Connexions)
const SANDRA_AGENT_ID = process.env.SANDRA_AGENT_ID || 'agent_5301kcmgv5vwfeybge7g5ryrsm9p';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { userName } = body;

    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;

    if (!elevenLabsApiKey) {
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured' },
        { status: 500 }
      );
    }

    // Get signed URL from ElevenLabs with dynamic variables for personalization
    const signedUrlResponse = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${SANDRA_AGENT_ID}`,
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
      agentId: SANDRA_AGENT_ID,
      signedUrl,
      userName: userName || null,
    });
  } catch (error) {
    console.error('Setup agent voice start error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
