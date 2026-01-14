// app/api/verify-agent/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/verify-agent
 * Verifies that an ElevenLabs agent exists and is accessible
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const elevenLabsAgentId =
      body.elevenLabsAgentId || body.agentId;

    if (!elevenLabsAgentId) {
      return NextResponse.json(
        { error: 'ElevenLabs agent ID required', verified: false },
        { status: 400 }
      );
    }

    const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenLabsKey) {
      return NextResponse.json({
        verified: true,
        message: 'Verification skipped – no API key configured',
      });
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/agents/${elevenLabsAgentId}`,
      {
        headers: { 'xi-api-key': elevenLabsKey },
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error('[Verify ElevenLabs] Failed:', text);

      return NextResponse.json(
        { verified: false, error: 'Agent not ready' },
        { status: 503 }
      );
    }

    const agentData = await response.json();

    return NextResponse.json({
      verified: true,
      agentId: elevenLabsAgentId,
      agentName: agentData?.name,
    });

  } catch (error) {
    console.error('[Verify ElevenLabs] Error:', error);
    return NextResponse.json(
      { verified: false, error: 'Verification failed' },
      { status: 500 }
    );
  }
}
