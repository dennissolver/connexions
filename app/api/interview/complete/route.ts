// app/api/interview/complete/route.ts.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { interviewId, status } = body;

    if (!interviewId) {
      return NextResponse.json(
        { error: 'Interview ID required' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    const { error } = await supabase
      .from('interviews')
      .update({
        status: status || 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', interviewId);

    if (error) {
      console.error('Failed to update interview:', error);
      return NextResponse.json(
        { error: 'Failed to update interview' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Interview complete error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

