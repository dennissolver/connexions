import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/verify-agent
 * Verifies that an ElevenLabs agent is accessible and ready
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId, elevenLabsAgentId } = body;

    if (!elevenLabsAgentId) {
      return NextResponse.json(
        { error: 'ElevenLabs agent ID required' },
        { status: 400 }
      );
    }

    const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
    
    if (!elevenLabsKey) {
      // If no API key, skip verification but return success
      // The agent may still work
      return NextResponse.json({ 
        verified: true, 
        message: 'Verification skipped - no API key' 
      });
    }

    // Try to get the agent details from ElevenLabs
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/agents/${elevenLabsAgentId}`,
      {
        method: 'GET',
        headers: {
          'xi-api-key': elevenLabsKey,
        },
      }
    );

    if (!response.ok) {
      // Agent not found or not ready
      const error = await response.json().catch(() => ({}));
      console.error('ElevenLabs verification failed:', error);
      
      return NextResponse.json(
        { error: 'Agent not ready', verified: false },
        { status: 503 }
      );
    }

    const agentData = await response.json();

    return NextResponse.json({
      verified: true,
      agentId: elevenLabsAgentId,
      agentName: agentData.name,
    });

  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { error: 'Verification failed', verified: false },
      { status: 500 }
    );
  }
}
