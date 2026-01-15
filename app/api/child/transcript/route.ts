// app/api/child/transcript/route.ts.ts
// Parent Connexions endpoint - receives transcripts from child platforms for centralized evaluation
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Verify API key from child
    const authHeader = request.headers.get('Authorization');
    const expectedKey = process.env.CHILD_API_KEY;

    if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.slice(7) !== expectedKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      childPlatformId,
      interviewId,
      agentId,
      agentName,
      conversationId,
      transcript,
      analysis,
      metadata,
      status,
      completedAt,
    } = body;

    console.log(`Received transcript from child platform: ${childPlatformId}`);

    const supabase = createClient();

    // Store in parent's centralized transcript table
    const { data: stored, error: storeError } = await supabase
      .from('child_transcripts')
      .upsert({
        child_platform_id: childPlatformId,
        child_interview_id: interviewId,
        child_agent_id: agentId,
        agent_name: agentName,
        elevenlabs_conversation_id: conversationId,
        transcript: transcript,
        elevenlabs_analysis: analysis,
        metadata: metadata,
        status: status,
        completed_at: completedAt,
        received_at: new Date().toISOString(),
        evaluation_status: 'pending',
      }, {
        onConflict: 'elevenlabs_conversation_id'
      })
      .select()
      .single();

    if (storeError) {
      console.error('Failed to store child transcript:', storeError);
      return NextResponse.json({ error: 'Failed to store transcript' }, { status: 500 });
    }

    // Queue for evaluation (could trigger async job here)
    // For now, run evaluation inline
    const evaluationResult = await runEvaluation(stored.id, transcript, agentName, supabase);

    // Update with evaluation results
    if (evaluationResult) {
      await supabase
        .from('child_transcripts')
        .update({
          evaluation_status: 'completed',
          evaluation_result: evaluationResult,
          evaluated_at: new Date().toISOString(),
        })
        .eq('id', stored.id);
    }

    return NextResponse.json({
      success: true,
      transcriptId: stored.id,
      evaluationStatus: evaluationResult ? 'completed' : 'pending',
    });

  } catch (error) {
    console.error('Child transcript endpoint error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Run centralized evaluation using Anthropic
async function runEvaluation(
  transcriptId: string,
  transcript: any,
  agentName: string,
  supabase: any
): Promise<any | null> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    console.warn('ANTHROPIC_API_KEY not set, skipping evaluation');
    return null;
  }

  try {
    // Format transcript for evaluation
    const formattedTranscript = Array.isArray(transcript)
      ? transcript.map((t: any) => `${t.role}: ${t.message || t.text || t.content}`).join('\n')
      : typeof transcript === 'string'
        ? transcript
        : JSON.stringify(transcript);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: `Evaluate this AI interview transcript for quality and adherence to best practices.

Agent Name: ${agentName}

Transcript:
${formattedTranscript}

Please evaluate on these dimensions (score 1-10 each):
1. Goal Achievement - Did the agent accomplish the interview objectives?
2. Conversation Quality - Was the dialogue natural and professional?
3. User Engagement - Did the agent keep the interviewee engaged?
4. Prompt Adherence - Did the agent stay on topic and follow expected patterns?

Also identify:
- Any drift from expected behavior
- Potential issues or red flags
- Suggestions for improvement

Return your evaluation as JSON with this structure:
{
  "scores": {
    "goalAchievement": number,
    "conversationQuality": number,
    "userEngagement": number,
    "promptAdherence": number,
    "overall": number
  },
  "drift": {
    "detected": boolean,
    "severity": "none" | "minor" | "moderate" | "severe",
    "examples": string[]
  },
  "issues": string[],
  "suggestions": string[],
  "summary": string
}`
          }
        ],
      }),
    });

    if (!response.ok) {
      console.error('Anthropic API error:', await response.text());
      return null;
    }

    const result = await response.json();
    const content = result.content?.[0]?.text;

    if (!content) {
      return null;
    }

    // Parse JSON from response (handle markdown code blocks)
    let evaluation;
    try {
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      evaluation = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse evaluation JSON:', parseError);
      evaluation = { raw: content };
    }

    // Check for drift and create alert if needed
    if (evaluation.drift?.detected && evaluation.drift?.severity !== 'none') {
      await supabase
        .from('evaluation_alerts')
        .insert({
          transcript_id: transcriptId,
          alert_type: 'drift_detected',
          severity: evaluation.drift.severity,
          message: `Drift detected in agent "${agentName}": ${evaluation.drift.examples?.join(', ') || 'See evaluation details'}`,
          evaluation_data: evaluation,
          status: 'pending',
        });
    }

    return evaluation;

  } catch (error) {
    console.error('Evaluation error:', error);
    return null;
  }
}

// GET endpoint to check status
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'Child transcript receiver active',
    endpoint: '/api/child/transcript',
    method: 'POST',
    required: ['Authorization header', 'childPlatformId', 'transcript'],
  });
}
