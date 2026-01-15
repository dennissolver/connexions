// app/api/webhooks/register-agent/route.ts.ts
// Registers agent_id â†’ platform mappings and resolves any unrouted webhook backlog

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
// Types
// -----------------------------------------------------------------------------

interface RegisterAgentRequest {
  agent_id: string;
  platform_url: string;
  platform_name: string;
  platform_id?: string;
  agent_type?: 'setup' | 'interview';
  api_key?: string;
}

// -----------------------------------------------------------------------------
// POST â€“ Register or update agent routing
// -----------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body: RegisterAgentRequest = await request.json();

    if (!body.agent_id || !body.platform_url || !body.platform_name) {
      return NextResponse.json(
        { error: 'Missing required fields: agent_id, platform_url, platform_name' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('agent_routes')
      .upsert(
        {
          agent_id: body.agent_id,
          platform_url: body.platform_url.replace(/\/$/, ''),
          platform_name: body.platform_name,
          platform_id: body.platform_id ?? null,
          agent_type: body.agent_type ?? 'interview',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'agent_id' }
      )
      .select()
      .single();

    if (error) {
      console.error('[register-agent] Upsert failed:', error);
      return NextResponse.json(
        { error: 'Failed to register agent route.ts', details: error.message },
        { status: 500 }
      );
    }

    // Fire-and-forget cleanup of unrouted webhook backlog
    const { error: resolveError } = await supabase
      .from('unrouted_webhooks')
      .update({
        resolved: true,
        resolved_at: new Date().toISOString(),
      })
      .eq('agent_id', body.agent_id)
      .eq('resolved', false);

    if (resolveError) {
      console.warn(
        '[register-agent] Failed to resolve unrouted webhooks:',
        resolveError.message
      );
    }

    return NextResponse.json({
      success: true,
      message: `Agent ${body.agent_id} registered for webhook routing`,
      route: {
        agent_id: data.agent_id,
        platform_name: data.platform_name,
        platform_url: data.platform_url,
        agent_type: data.agent_type,
      },
    });

  } catch (error) {
    console.error('[register-agent] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown',
      },
      { status: 500 }
    );
  }
}

// -----------------------------------------------------------------------------
// GET â€“ Fetch route.ts(s)
// -----------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agent_id');
    const platformId = searchParams.get('platform_id');

    const supabase = getSupabase();

    if (agentId) {
      const { data, error } = await supabase
        .from('agent_routes')
        .select('*')
        .eq('agent_id', agentId)
        .single();

      if (error || !data) {
        return NextResponse.json(
          { error: 'Agent route.ts not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ route: data });
    }

    if (platformId) {
      const { data, error } = await supabase
        .from('agent_routes')
        .select('*')
        .eq('platform_id', platformId)
        .order('created_at', { ascending: false });

      if (error) {
        return NextResponse.json(
          { error: 'Failed to fetch routes' },
          { status: 500 }
        );
      }

      return NextResponse.json({ routes: data || [] });
    }

    const { data, error } = await supabase
      .from('agent_routes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch routes' },
        { status: 500 }
      );
    }

    return NextResponse.json({ routes: data || [] });

  } catch (error) {
    console.error('[register-agent GET] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// -----------------------------------------------------------------------------
// DELETE â€“ Remove agent route.ts
// -----------------------------------------------------------------------------

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agent_id');

    if (!agentId) {
      return NextResponse.json(
        { error: 'Missing agent_id parameter' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    const { error } = await supabase
      .from('agent_routes')
      .delete()
      .eq('agent_id', agentId);

    if (error) {
      console.error('[register-agent DELETE] Error:', error);
      return NextResponse.json(
        { error: 'Failed to delete route.ts' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Route for agent ${agentId} deleted`,
    });

  } catch (error) {
    console.error('[register-agent DELETE] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

