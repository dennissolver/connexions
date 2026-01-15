// app/api/demo/status/[leadId]/route.ts.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  req: NextRequest,
  { params }: { params: { leadId: string } }
) {
  try {
    const { leadId } = params;

    const { data: lead, error } = await supabase
      .from('demo_leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (error || !lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: lead.status,
      // Status progression: new → setup_started → setup_complete → parsing → trial_ready → trial_started → trial_complete
      setupAgentId: lead.setup_agent_id,
      setupConversationId: lead.setup_conversation_id,
      trialAgentId: lead.trial_agent_id,
      trialConversationId: lead.trial_conversation_id,
      interviewSpec: lead.interview_spec,
      trialResults: lead.trial_results,
    });

  } catch (error: any) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check status' },
      { status: 500 }
    );
  }
}