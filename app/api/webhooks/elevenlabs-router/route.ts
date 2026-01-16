// app/api/webhooks/elevenlabs-router/route.ts
// Central webhook router - receives ALL ElevenLabs webhooks and forwards to correct child platform

export const runtime = 'nodejs';
export const maxDuration = 30;

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// -----------------------------------------------------------------------------
// Supabase helper (Connexions parent database)
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
// POST — Main webhook receiver from ElevenLabs
// -----------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await req.json();

    console.log('[elevenlabs-router] Received webhook:', {
      type: body.type,
      event_type: body.event_type,
      agent_id: body.agent_id,
      conversation_id: body.conversation_id,
    });

    // Extract key identifiers
    const agentId = body.agent_id || body.data?.agent_id;
    const conversationId = body.conversation_id || body.data?.conversation_id;
    const eventType = body.type || body.event_type;

    if (!agentId) {
      console.warn('[elevenlabs-router] No agent_id in webhook');
      return NextResponse.json({ success: false, error: 'No agent_id' }, { status: 400 });
    }

    const supabase = getSupabase();

    // ---------------------------------------------------------------------
    // 1. Find which child platform owns this agent
    // ---------------------------------------------------------------------

    // Check the platforms table for agent mapping
    const { data: platform, error: platformError } = await supabase
      .from('platforms')
      .select('id, name, slug, url, supabase_url')
      .eq('elevenlabs_agent_id', agentId)
      .single();

    if (platformError && platformError.code !== 'PGRST116') {
      console.error('[elevenlabs-router] Platform lookup error:', platformError);
    }

    let targetUrl: string | null = null;

    if (platform?.url) {
      targetUrl = platform.url;
      console.log('[elevenlabs-router] Found platform by agent:', {
        platform: platform.name,
        url: targetUrl,
      });
    } else {
      // Fallback: Check agent_routes table if it exists
      const { data: route } = await supabase
        .from('agent_routes')
        .select('platform_url, platform_id')
        .eq('elevenlabs_agent_id', agentId)
        .single();

      if (route?.platform_url) {
        targetUrl = route.platform_url;
        console.log('[elevenlabs-router] Found platform in agent_routes:', targetUrl);
      }
    }

    // ---------------------------------------------------------------------
    // 2. If no platform found, store as unrouted for later resolution
    // ---------------------------------------------------------------------

    if (!targetUrl) {
      console.warn('[elevenlabs-router] No platform found for agent:', agentId);

      // Store in unrouted_webhooks for later processing
      await supabase.from('unrouted_webhooks').insert({
        agent_id: agentId,
        conversation_id: conversationId,
        event_type: eventType,
        payload: body,
        received_at: new Date().toISOString(),
        resolved: false,
      }).catch(err => {
        console.error('[elevenlabs-router] Failed to store unrouted webhook:', err);
      });

      return NextResponse.json({
        success: false,
        error: 'No platform found for agent',
        agent_id: agentId,
        stored_for_retry: true,
      }, { status: 202 }); // 202 = Accepted but not processed
    }

    // ---------------------------------------------------------------------
    // 3. Forward webhook to child platform
    // ---------------------------------------------------------------------

    const childWebhookUrl = `${targetUrl}/api/webhooks/elevenlabs`;

    console.log('[elevenlabs-router] Forwarding to child:', {
      url: childWebhookUrl,
      event_type: eventType,
      conversation_id: conversationId,
    });

    try {
      const forwardResponse = await fetch(childWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-From': 'connexions-router',
          'X-Original-Agent-Id': agentId,
          // Pass through any auth headers
          ...(req.headers.get('X-ElevenLabs-Signature') && {
            'X-ElevenLabs-Signature': req.headers.get('X-ElevenLabs-Signature')!,
          }),
        },
        body: JSON.stringify(body),
      });

      const responseText = await forwardResponse.text();
      let responseData;

      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { raw: responseText };
      }

      console.log('[elevenlabs-router] Child response:', {
        status: forwardResponse.status,
        ok: forwardResponse.ok,
        data: responseData,
      });

      // Log successful forward
      await supabase.from('webhook_logs').insert({
        source: 'elevenlabs',
        destination: childWebhookUrl,
        agent_id: agentId,
        conversation_id: conversationId,
        event_type: eventType,
        status: forwardResponse.ok ? 'success' : 'failed',
        response_status: forwardResponse.status,
        duration_ms: Date.now() - startTime,
      }).catch(() => {}); // Don't fail if logging fails

      if (!forwardResponse.ok) {
        return NextResponse.json({
          success: false,
          error: 'Child platform returned error',
          child_status: forwardResponse.status,
          child_response: responseData,
        }, { status: 502 });
      }

      return NextResponse.json({
        success: true,
        forwarded_to: platform?.name || targetUrl,
        child_response: responseData,
        duration_ms: Date.now() - startTime,
      });

    } catch (forwardError: any) {
      console.error('[elevenlabs-router] Forward failed:', {
        url: childWebhookUrl,
        error: forwardError.message,
      });

      // Store failed forward for retry
      await supabase.from('unrouted_webhooks').insert({
        agent_id: agentId,
        conversation_id: conversationId,
        event_type: eventType,
        payload: body,
        target_url: childWebhookUrl,
        error: forwardError.message,
        received_at: new Date().toISOString(),
        resolved: false,
      }).catch(() => {});

      return NextResponse.json({
        success: false,
        error: 'Failed to forward to child platform',
        details: forwardError.message,
      }, { status: 502 });
    }

  } catch (err: any) {
    console.error('[elevenlabs-router] Fatal error:', err);

    return NextResponse.json(
      { success: false, error: 'Internal server error', details: err.message },
      { status: 500 }
    );
  }
}

// -----------------------------------------------------------------------------
// GET — Health check / status
// -----------------------------------------------------------------------------

export async function GET() {
  return NextResponse.json({
    status: 'active',
    endpoint: 'elevenlabs-router',
    description: 'Central webhook router that forwards ElevenLabs events to child platforms',
    flow: 'ElevenLabs → This Router → Child Platform /api/webhooks/elevenlabs',
    table: 'platforms',
  });
}