// app/api/interview/complete/route.ts
// UPDATED: Now triggers evaluation after marking interview complete

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { evalRunner } from '@/lib/eval-runner';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { interviewId, agentId, transcript, conversationId } = body;

    if (!interviewId && !conversationId) {
      return NextResponse.json(
        { error: 'Interview ID or Conversation ID required' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find interview by ID or conversation ID
    let interview;
    if (interviewId) {
      const { data } = await supabase
        .from('interviews')
        .select('*')
        .eq('id', interviewId)
        .single();
      interview = data;
    } else if (conversationId) {
      const { data } = await supabase
        .from('interviews')
        .select('*')
        .eq('elevenlabs_conversation_id', conversationId)
        .single();
      interview = data;
    }

    if (!interview) {
      return NextResponse.json(
        { error: 'Interview not found' },
        { status: 404 }
      );
    }

    // Update interview status
    const updateData: any = {
      status: 'completed',
      completed_at: new Date().toISOString(),
    };

    // Store transcript if provided
    if (transcript) {
      updateData.transcript = transcript;
    }

    // Calculate duration
    if (interview.started_at) {
      const startTime = new Date(interview.started_at).getTime();
      const endTime = Date.now();
      updateData.duration_seconds = Math.round((endTime - startTime) / 1000);
    }

    const { error: updateError } = await supabase
      .from('interviews')
      .update(updateData)
      .eq('id', interview.id);

    if (updateError) {
      console.error('Failed to update interview:', updateError);
      return NextResponse.json(
        { error: 'Failed to complete interview' },
        { status: 500 }
      );
    }

    // Increment completed interviews counter
    if (interview.agent_id) {
      await supabase.rpc('increment_agent_completed_interviews', { 
        p_agent_id: interview.agent_id 
      });
    }

    // =========================================
    // TRIGGER EVALUATION (async, don't block)
    // =========================================
    triggerEvaluation(interview.id).catch(error => {
      console.error('Background evaluation failed:', error);
    });

    return NextResponse.json({
      success: true,
      interviewId: interview.id,
      status: 'completed',
      duration_seconds: updateData.duration_seconds,
      evaluation_status: 'pending', // Evaluation runs in background
    });

  } catch (error) {
    console.error('Interview complete error:', error);
    return NextResponse.json(
      { error: 'Failed to complete interview' },
      { status: 500 }
    );
  }
}

/**
 * Trigger evaluation in background
 * This runs async so the user gets immediate response
 */
async function triggerEvaluation(interviewId: string): Promise<void> {
  try {
    console.log(`Starting evaluation for interview ${interviewId}`);
    
    const result = await evalRunner.evaluateInterview(interviewId);
    
    if (result) {
      console.log(`Evaluation complete for ${interviewId}: Score ${result.overall_score}`);
    } else {
      console.log(`Evaluation skipped for ${interviewId} (no transcript or too short)`);
    }
  } catch (error) {
    console.error(`Evaluation failed for ${interviewId}:`, error);
    // Don't throw - we don't want to break the completion flow
  }
}
