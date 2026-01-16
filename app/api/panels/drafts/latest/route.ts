// app/api/panels/drafts/latest/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Get drafts created in the last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data: draft, error } = await supabase
      .from('panel_drafts')
      .select('*')
      .eq('status', 'draft')
      .gte('created_at', fiveMinutesAgo)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !draft) {
      return NextResponse.json({ found: false }, { status: 404 });
    }

    console.log('[drafts/latest] Found draft:', draft.id);
    return NextResponse.json({ ...draft, found: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, found: false }, { status: 500 });
  }
}