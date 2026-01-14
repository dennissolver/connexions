// app/api/demo/update-status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { leadId, status, conversationId } = await req.json();

    const updateData: any = { status };
    
    if (status === 'setup_started' && conversationId) {
      updateData.setup_conversation_id = conversationId;
    }
    if (status === 'trial_started' && conversationId) {
      updateData.trial_conversation_id = conversationId;
    }

    const { error } = await supabase
      .from('demo_leads')
      .update(updateData)
      .eq('id', leadId);

    if (error) throw error;

    return NextResponse.json({ success: true });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
