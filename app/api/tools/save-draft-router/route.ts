// app/api/tools/save-draft-router/route.ts
// Central router for Sandra tool calls - logs for evals and forwards to child platforms

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  console.log('[save-draft-router] Received tool call');

  let agentId: string | null = null;
  let projectSlug: string | null = null;
  let childUrl: string | null = null;
  let requestBody: any = null;

  try {
    requestBody = await req.json();
    console.log('[save-draft-router] Body:', JSON.stringify(requestBody, null, 2));

    // Get identifiers from query params (baked into tool URL during agent creation)
    agentId = req.nextUrl.searchParams.get('agent_id');
    projectSlug = req.nextUrl.searchParams.get('project_slug');

    console.log('[save-draft-router] Agent ID:', agentId);
    console.log('[save-draft-router] Project Slug:', projectSlug);

    // Method 1: Direct lookup by project_slug (fastest)
    if (projectSlug) {
      const { data: run } = await supabase
        .from('provision_runs')
        .select('metadata')
        .eq('project_slug', projectSlug)
        .eq('status', 'complete')
        .single();

      if (run?.metadata?.vercel_url) {
        childUrl = run.metadata.vercel_url;
        console.log('[save-draft-router] Found child URL from project_slug:', childUrl);
      }
    }

    // Method 2: Look up by agent_id in provision_runs metadata
    if (!childUrl && agentId) {
      const { data: runs } = await supabase
        .from('provision_runs')
        .select('project_slug, metadata')
        .eq('status', 'complete');

      if (runs) {
        for (const run of runs) {
          // Check both sandra_agent_id and kira_agent_id
          if (
            run.metadata?.sandra_agent_id === agentId ||
            run.metadata?.kira_agent_id === agentId
          ) {
            childUrl = run.metadata.vercel_url;
            projectSlug = run.project_slug;
            console.log('[save-draft-router] Found child URL from agent_id lookup:', childUrl);
            break;
          }
        }
      }
    }

    // Method 3: Check agent_routes table (legacy/backup)
    if (!childUrl && agentId) {
      const { data: route } = await supabase
        .from('agent_routes')
        .select('platform_url, project_slug')
        .eq('agent_id', agentId)
        .single();

      if (route?.platform_url) {
        childUrl = route.platform_url;
        projectSlug = route.project_slug || projectSlug;
        console.log('[save-draft-router] Found child URL from agent_routes:', childUrl);
      }
    }

    if (!childUrl) {
      console.error('[save-draft-router] Could not find child platform');

      // Log failed routing attempt
      await logToolCall({
        agent_id: agentId,
        agent_type: 'sandra',
        tool_name: 'save_panel_draft',
        project_slug: projectSlug,
        request_body: requestBody,
        response_body: { error: 'Could not find child platform' },
        response_status: 404,
        child_url: null,
        duration_ms: Date.now() - startTime,
      });

      return NextResponse.json(
        {
          error: 'Could not find child platform',
          agent_id: agentId,
          project_slug: projectSlug,
        },
        { status: 404 }
      );
    }

    // Forward to child platform's save-draft endpoint
    const targetUrl = `${childUrl}/api/tools/save-draft`;
    console.log('[save-draft-router] Forwarding to:', targetUrl);

    const forwardRes = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-agent-id': agentId || '',
        'x-project-slug': projectSlug || '',
        'x-forwarded-by': 'connexions-router',
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await forwardRes.text();
    console.log('[save-draft-router] Child response status:', forwardRes.status);
    console.log('[save-draft-router] Child response:', responseText);

    // Parse response
    let responseData: any;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { message: responseText };
    }

    // Log successful routing for evals
    await logToolCall({
      agent_id: agentId,
      agent_type: 'sandra',
      tool_name: 'save_panel_draft',
      project_slug: projectSlug,
      request_body: requestBody,
      response_body: responseData,
      response_status: forwardRes.status,
      child_url: childUrl,
      duration_ms: Date.now() - startTime,
    });

    return NextResponse.json(responseData, { status: forwardRes.status });

  } catch (error: any) {
    console.error('[save-draft-router] Error:', error);

    // Log error
    await logToolCall({
      agent_id: agentId,
      agent_type: 'sandra',
      tool_name: 'save_panel_draft',
      project_slug: projectSlug,
      request_body: requestBody,
      response_body: { error: error.message },
      response_status: 500,
      child_url: childUrl,
      duration_ms: Date.now() - startTime,
    });

    return NextResponse.json(
      { error: 'Router error', details: error.message },
      { status: 500 }
    );
  }
}

// Central logging for evals and drift detection
async function logToolCall(data: {
  agent_id: string | null;
  agent_type: string;
  tool_name: string;
  project_slug: string | null;
  request_body: any;
  response_body: any;
  response_status: number;
  child_url: string | null;
  duration_ms: number;
}) {
  try {
    await supabase.from('tool_calls_log').insert({
      agent_id: data.agent_id,
      agent_type: data.agent_type,
      tool_name: data.tool_name,
      project_slug: data.project_slug,
      request_body: data.request_body,
      response_body: data.response_body,
      response_status: data.response_status,
      child_url: data.child_url,
      duration_ms: data.duration_ms,
    });
  } catch (err) {
    // Don't fail the request if logging fails
    console.error('[save-draft-router] Failed to log tool call:', err);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-agent-id, x-project-slug',
    },
  });
}