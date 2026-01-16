// app/api/tools/save-draft-router/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  console.log('[save-draft-router] Received tool call');

  try {
    const body = await req.json();
    console.log('[save-draft-router] Body:', JSON.stringify(body, null, 2));

    // Agent ID comes from query param (baked into tool URL)
    const agentId = req.nextUrl.searchParams.get('agent_id');
    console.log('[save-draft-router] Agent ID from URL:', agentId);

    if (!agentId) {
      console.error('[save-draft-router] No agent_id in URL query params');
      return NextResponse.json(
        { error: 'Missing agent_id in URL' },
        { status: 400 }
      );
    }

    let childUrl: string | null = null;

    // Method 1: Look up by agent_id in agent_routes table
    const { data: route } = await supabase
      .from('agent_routes')
      .select('platform_url')
      .eq('agent_id', agentId)
      .single();

    if (route?.platform_url) {
      childUrl = route.platform_url;
      console.log('[save-draft-router] Found child URL from agent_routes:', childUrl);
    }

    // Method 2: Look up by agent_id in provision_runs metadata
    if (!childUrl) {
      const { data: runs } = await supabase
        .from('provision_runs')
        .select('metadata')
        .eq('state', 'COMPLETE');

      if (runs) {
        for (const run of runs) {
          if (run.metadata?.elevenLabsAgentId === agentId) {
            childUrl = run.metadata.vercelUrl;
            console.log('[save-draft-router] Found child URL from provision_runs:', childUrl);
            break;
          }
        }
      }
    }

    if (!childUrl) {
      console.error('[save-draft-router] Could not find child platform for agent:', agentId);

      supabase.from('webhook_logs').insert({
        webhook_type: 'save-draft-router',
        agent_id: agentId,
        error_message: 'Could not find child platform',
      }).then(() => {});

      return NextResponse.json(
        { error: 'Could not find child platform', agent_id: agentId },
        { status: 400 }
      );
    }

    // Forward to child platform's save-draft endpoint
    const targetUrl = `${childUrl}/api/tools/save-draft`;
    console.log('[save-draft-router] Forwarding to:', targetUrl);

    const forwardRes = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-agent-id': agentId,
        'x-forwarded-by': 'connexions-router',
      },
      body: JSON.stringify(body),
    });

    const responseText = await forwardRes.text();
    console.log('[save-draft-router] Child response status:', forwardRes.status);
    console.log('[save-draft-router] Child response:', responseText);

    // Log successful routing
    supabase.from('webhook_logs').insert({
      webhook_type: 'save-draft-router',
      agent_id: agentId,
      platform_url: childUrl,
      forward_status: forwardRes.status,
    }).then(() => {});

    // Return the child's response
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { message: responseText };
    }

    return NextResponse.json(responseData, { status: forwardRes.status });

  } catch (error: any) {
    console.error('[save-draft-router] Error:', error);
    return NextResponse.json(
      { error: 'Router error', details: error.message },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}