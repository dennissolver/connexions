// app/api/tools/save-draft/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[save-draft] Received:', JSON.stringify(body, null, 2));

    // ElevenLabs sends conversation_id in various ways
    const conversation_id =
      body.conversation_id ||
      body.conversationId ||
      body.context?.conversation_id ||
      request.headers.get('x-conversation-id') ||
      null;

    const {
      name,
      description,
      interview_type,
      target_audience,
      tone,
      duration_minutes,
      questions,
    } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json({
        error: 'Panel name is required',
        success: false
      }, { status: 400 });
    }

    // Normalize questions to array
    let questionsList: string[] = [];
    if (typeof questions === 'string') {
      questionsList = questions.split(',').map((q: string) => q.trim()).filter(Boolean);
    } else if (Array.isArray(questions)) {
      questionsList = questions;
    }

    // Save draft to database
    const { data: draft, error: dbError } = await supabase
      .from('panel_drafts')
      .insert({
        name,
        description: description || '',
        interview_type: interview_type || '',
        target_audience: target_audience || '',
        tone: tone || 'professional',
        duration_minutes: duration_minutes || 15,
        questions: questionsList,
        conversation_id: conversation_id,
        status: 'draft',
      })
      .select()
      .single();

    if (dbError) {
      console.error('[save-draft] Database error:', dbError);
      return NextResponse.json({
        error: `Failed to save draft: ${dbError.message}`,
        success: false
      }, { status: 500 });
    }

    console.log('[save-draft] Saved draft:', draft.id, 'conversation_id:', conversation_id);

    // Return success message for Sandra to speak
    return NextResponse.json({
      success: true,
      message: `I've saved your panel "${name}" as a draft. You can see it on your screen now to review and make any changes.`,
      draft_id: draft.id,
      review_url: `/panels/drafts/${draft.id}`,
    });

  } catch (error: any) {
    console.error('[save-draft] Error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to save draft',
      success: false
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'active', endpoint: 'save-draft' });
}