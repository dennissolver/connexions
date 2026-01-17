// lib/provisioning/supabase/config.ts
// Configures Supabase auth URLs - DEPENDS ON: vercel (needs URL)

import { ProvisionContext, StepResult } from '../types';

const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

export async function supabaseConfigExecute(ctx: ProvisionContext): Promise<StepResult> {
  // Already configured? Skip (idempotent)
  if (ctx.metadata.supabase_urls_configured) {
    console.log(`[supabase-config.execute] Already configured`);
    return { status: 'advance' };
  }

  if (!SUPABASE_ACCESS_TOKEN) {
    return {
      status: 'fail',
      error: 'SUPABASE_ACCESS_TOKEN not configured',
    };
  }

  const projectRef = ctx.metadata.supabase_project_ref as string;
  const vercelUrl = ctx.metadata.vercel_url as string;

  if (!projectRef || !vercelUrl) {
    return { status: 'wait' };
  }

  try {
    // Configure auth settings via Supabase Management API
    const authConfigUrl = `https://api.supabase.com/v1/projects/${projectRef}/config/auth`;

    // Set site URL and redirect URLs
    const res = await fetch(authConfigUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        site_url: vercelUrl,
        uri_allow_list: [
          'http://localhost:3000/**',
          'http://localhost:3000',
          `${vercelUrl}/**`,
          vercelUrl,
        ].join(','),
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      // If 404, the config endpoint might not exist yet - wait
      if (res.status === 404) {
        console.log(`[supabase-config.execute] Auth config not ready yet`);
        return { status: 'wait' };
      }
      return {
        status: 'fail',
        error: `Supabase config API error (${res.status}): ${text}`,
      };
    }

    console.log(`[supabase-config.execute] Configured URLs for ${projectRef}`);

    return {
      status: 'advance',
      metadata: {
        supabase_urls_configured: true,
      },
    };
  } catch (err) {
    return {
      status: 'fail',
      error: `Supabase config failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export async function supabaseConfigVerify(ctx: ProvisionContext): Promise<StepResult> {
  // Config is immediate - if execute succeeded, we're done
  if (ctx.metadata.supabase_urls_configured) {
    return { status: 'advance' };
  }
  return { status: 'wait' };
}
