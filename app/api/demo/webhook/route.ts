// app/api/demo/webhook/route.ts.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { event_type, conversation_id, transcript } = body;

    console.log('Webhook received:', event_type, conversation_id);

    if (event_type === 'conversation.ended' || event_type === 'conversation.transcript') {
      // Check if it's a setup conversation
      const { data: setupLead } = await supabase
        .from('demo_leads')
        .select('*')
        .eq('setup_conversation_id', conversation_id)
        .single();

      if (setupLead) {
        await supabase
          .from('demo_leads')
          .update({
            setup_transcript: transcript,
            status: 'setup_complete',
          })
          .eq('id', setupLead.id);

        // Trigger async parsing
        fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/demo/parse-and-create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leadId: setupLead.id }),
        }).catch(console.error);

        return NextResponse.json({ success: true, type: 'setup_complete' });
      }

      // Check if it's a trial conversation
      const { data: trialLead } = await supabase
        .from('demo_leads')
        .select('*')
        .eq('trial_conversation_id', conversation_id)
        .single();

      if (trialLead) {
        await supabase
          .from('demo_leads')
          .update({
            trial_transcript: transcript,
            status: 'trial_complete',
          })
          .eq('id', trialLead.id);

        // Trigger results email
        fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/demo/send-results`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leadId: trialLead.id }),
        }).catch(console.error);

        return NextResponse.json({ success: true, type: 'trial_complete' });
      }
    }

    return NextResponse.json({ success: true, type: 'ignored' });

  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
