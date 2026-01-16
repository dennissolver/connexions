// app/api/tools/save-draft-router/route.ts
// Routes save_panel_draft tool calls from ElevenLabs to the correct child platform

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

    // ElevenLabs sends conversation context in headers or body
    // We need to identify which child platform this belongs to
    const conversationId = req.headers.get('x-conversation-id') || body.conversation_id;
    const agentId = req.headers.get('x-agent-id') || body.agent_id;

    console.log('[save-draft-router] Conversation ID:', conversationId);
    console.log('[save-draft-router] Agent ID:', agentId);

    let childUrl: string | null = null;

    // Method 1: Look up by agent_id in agent_routes table
    if (agentId) {
      const { data: route } = await supabase
        .from('agent_routes')
        .select('child_url')
        .eq('agent_id', agentId)
        .single();

      if (route?.child_url) {
        childUrl = route.child_url;
        console.log('[save-draft-router] Found child URL from agent_routes:', childUrl);
      }
    }

    // Method 2: Look up by agent_id in provisioned_platforms metadata
    if (!childUrl && agentId) {
      const { data: platforms } = await supabase
        .from('provisioned_platforms')
        .select('metadata')
        .eq('state', 'COMPLETE');

      if (platforms) {
        for (const platform of platforms) {
          if (platform.metadata?.elevenLabsAgentId === agentId) {
            childUrl = platform.metadata.vercelUrl;
            console.log('[save-draft-router] Found child URL from provisioned_platforms:', childUrl);
            break;
          }
        }
      }
    }

    if (!childUrl) {
      console.error('[save-draft-router] Could not determine child platform for agent:', agentId);

      // Log for debugging
      await supabase.from('webhook_logs').insert({
        source: 'save-draft-router',
        event_type: 'routing_failed',
        agent_id: agentId,
        conversation_id: conversationId,
        payload: body,
        error: 'Could not determine child platform',
      });

      return NextResponse.json(
        { error: 'Could not determine child platform' },
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
        'x-conversation-id': conversationId || '',
        'x-agent-id': agentId || '',
        'x-forwarded-by': 'connexions-router',
      },
      body: JSON.stringify(body),
    });

    const responseText = await forwardRes.text();
    console.log('[save-draft-router] Child response status:', forwardRes.status);
    console.log('[save-draft-router] Child response:', responseText);

    // Log successful routing
    await supabase.from('webhook_logs').insert({
      source: 'save-draft-router',
      event_type: 'routed',
      agent_id: agentId,
      conversation_id: conversationId,
      payload: body,
      child_url: childUrl,
      response_status: forwardRes.status,
    });

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

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-conversation-id, x-agent-id',
    },
  });
}