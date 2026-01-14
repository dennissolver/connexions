// app/api/webhooks/elevenlabs-router/route.ts
// Connexions webhook router - receives all ElevenLabs webhooks and routes to correct child platform

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for Connexions
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase credentials');
  return createClient(url, key);
}

// ElevenLabs webhook payload types
interface ElevenLabsWebhookPayload {
  type: 'post_call_transcription' | 'post_call_audio' | 'call_initiation_failure';
  event_timestamp: number;
  data: {
    agent_id: string;
    conversation_id: string;
    status: string;
    transcript?: Array<{
      role: string;
      message: string;
      time_in_call_secs: number;
    }>;
    metadata?: Record<string, unknown>;
    analysis?: {
      evaluation_criteria_results?: Record<string, unknown>;
      data_collection_results?: Record<string, unknown>;
      call_successful?: string;
      transcript_summary?: string;
    };
    [key: string]: unknown;
  };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Get the raw body for signature verification and forwarding
    const rawBody = await request.text();
    let payload: ElevenLabsWebhookPayload;

    try {
      payload = JSON.parse(rawBody);
    } catch {
      console.error('[Router] Invalid JSON payload');
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // Extract agent_id
    const agentId = payload.data?.agent_id;
    if (!agentId) {
      console.error('[Router] No agent_id in payload');
      return NextResponse.json({ error: 'Missing agent_id' }, { status: 400 });
    }

    console.log(`[Router] Received webhook for agent: ${agentId}, type: ${payload.type}`);

    // Look up the platform for this agent
    const supabase = getSupabase();
    const { data: route, error: lookupError } = await supabase
      .from('agent_routes')
      .select('platform_url, platform_name, platform_id')
      .eq('agent_id', agentId)
      .single();

    if (lookupError || !route) {
      console.error(`[Router] No route found for agent ${agentId}:`, lookupError?.message);

      // Log unrouted webhook for debugging
      await supabase.from('unrouted_webhooks').insert({
        agent_id: agentId,
        payload_type: payload.type,
        conversation_id: payload.data?.conversation_id,
        received_at: new Date().toISOString(),
        payload_preview: JSON.stringify(payload).slice(0, 1000)
      }).catch(() => {}); // Don't fail if logging fails

      // Return 200 to prevent ElevenLabs from disabling the webhook
      // but log that we couldn't route it
      return NextResponse.json({
        status: 'unrouted',
        message: `No route configured for agent ${agentId}`,
        agent_id: agentId
      });
    }

    console.log(`[Router] Routing to ${route.platform_name}: ${route.platform_url}`);

    // Forward the webhook to the child platform
    const webhookUrl = `${route.platform_url}/api/webhooks/elevenlabs`;

    // Forward with original headers where relevant
    const forwardHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Pass through ElevenLabs signature if present (for verification at child)
    const signature = request.headers.get('elevenlabs-signature');
    if (signature) {
      forwardHeaders['elevenlabs-signature'] = signature;
    }

    // Add router metadata header
    forwardHeaders['x-connexions-router'] = 'true';
    forwardHeaders['x-connexions-agent-id'] = agentId;
    forwardHeaders['x-connexions-platform-id'] = route.platform_id || '';

    const forwardResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: forwardHeaders,
      body: rawBody, // Forward original body
    });

    const forwardStatus = forwardResponse.status;
    const forwardDuration = Date.now() - startTime;

    // Log the routing result
    await supabase.from('webhook_logs').insert({
      agent_id: agentId,
      platform_id: route.platform_id,
      platform_url: route.platform_url,
      webhook_type: payload.type,
      conversation_id: payload.data?.conversation_id,
      forward_status: forwardStatus,
      duration_ms: forwardDuration,
      created_at: new Date().toISOString()
    }).catch((err) => {
      console.error('[Router] Failed to log webhook:', err);
    });

    if (!forwardResponse.ok) {
      const errorText = await forwardResponse.text().catch(() => 'No response body');
      console.error(`[Router] Forward failed: ${forwardStatus} - ${errorText}`);

      // Still return 200 to ElevenLabs to prevent webhook disable
      // The child platform issue should be fixed separately
      return NextResponse.json({
        status: 'forward_failed',
        forward_status: forwardStatus,
        platform: route.platform_name,
        duration_ms: forwardDuration
      });
    }

    console.log(`[Router] Successfully forwarded to ${route.platform_name} in ${forwardDuration}ms`);

    return NextResponse.json({
      status: 'forwarded',
      platform: route.platform_name,
      forward_status: forwardStatus,
      duration_ms: forwardDuration
    });

  } catch (error) {
    console.error('[Router] Unexpected error:', error);

    // Return 200 to prevent webhook disable, but indicate error
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'active',
    service: 'elevenlabs-webhook-router',
    timestamp: new Date().toISOString()
  });
}