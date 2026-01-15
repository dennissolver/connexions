// app/api/panels/drafts/by-conversation/[conversationId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await params;

    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID required', found: false }, { status: 400 });
    }

    console.log('[by-conversation] Looking up draft for:', conversationId);

    const { data: draft, error } = await supabase
      .from('panel_drafts')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !draft) {
      console.log('[by-conversation] Draft not found for:', conversationId);
      return NextResponse.json({ error: 'Draft not found', found: false }, { status: 404 });
    }

    console.log('[by-conversation] Found draft:', draft.id);
    return NextResponse.json({ ...draft, found: true });
  } catch (error: any) {
    console.error('[by-conversation] Error:', error);
    return NextResponse.json({ error: error.message, found: false }, { status: 500 });
  }
}