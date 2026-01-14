// app/api/webhooks/elevenlabs-router/route.ts
// Internal Connexions helper for resolving unrouted ElevenLabs events
// NOT a live webhook endpoint

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// -----------------------------------------------------------------------------
// Supabase helper
// -----------------------------------------------------------------------------

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing Supabase credentials');
  }

  return createClient(url, key);
}

// -----------------------------------------------------------------------------
// POST â€“ Resolve unrouted webhook backlog for an agent
// -----------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body?.agent_id) {
      return NextResponse.json(
        { success: false, error: 'Missing agent_id' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // Fire-and-forget cleanup of unrouted events
    const { error } = await supabase
      .from('unrouted_webhooks')
      .update({
        resolved: true,
        resolved_at: new Date().toISOString(),
      })
      .eq('agent_id', body.agent_id)
      .eq('resolved', false);

    if (error) {
      console.warn('[elevenlabs-router] Cleanup failed:', {
        agent_id: body.agent_id,
        error: error.message,
      });
    }

    return NextResponse.json({
      success: true,
      agent_id: body.agent_id,
    });

  } catch (err) {
    console.error('[elevenlabs-router] Fatal error:', err);

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

