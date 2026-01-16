// lib/provisioning/steps/verify.ts

import { ProvisionContext } from '../types';

const SUPABASE_API = 'https://api.supabase.com/v1';
const GITHUB_API = 'https://api.github.com';
const VERCEL_API = 'https://api.vercel.com';
const ELEVENLABS_API = 'https://api.elevenlabs.io/v1';

export interface VerificationResult {
  success: boolean;
  error?: string;
  details?: Record<string, any>;
}

/**
 * Verify Supabase project exists and is healthy
 */
export async function verifySupabase(ctx: ProvisionContext): Promise<VerificationResult> {
  const projectRef = ctx.metadata.supabaseProjectRef;

  if (!projectRef) {
    return { success: false, error: 'No Supabase project ref in metadata' };
  }

  try {
    // Check project exists and is healthy
    const res = await fetch(`${SUPABASE_API}/projects/${projectRef}`, {
      headers: { Authorization: `Bearer ${ctx.supabaseToken}` },
    });

    if (!res.ok) {
      return { success: false, error: `Supabase API returned ${res.status}` };
    }

    const project = await res.json();

    if (project.status !== 'ACTIVE_HEALTHY') {
      return {
        success: false,
        error: `Supabase project status is ${project.status}, expected ACTIVE_HEALTHY`
      };
    }

    // Verify we have API keys
    if (!ctx.metadata.supabaseAnonKey || !ctx.metadata.supabaseServiceKey) {
      return { success: false, error: 'Missing Supabase API keys in metadata' };
    }

    // Verify tables exist by querying the platforms table
    const tableCheckRes = await fetch(
      `${ctx.metadata.supabaseUrl}/rest/v1/platforms?select=id&limit=1`,
      {
        headers: {
          'apikey': ctx.metadata.supabaseAnonKey,
          'Authorization': `Bearer ${ctx.metadata.supabaseServiceKey}`,
        },
      }
    );

    if (!tableCheckRes.ok) {
      return {
        success: false,
        error: `Schema verification failed: ${tableCheckRes.status}`
      };
    }

    return {
      success: true,
      details: {
        projectRef,
        status: project.status,
        url: ctx.metadata.supabaseUrl
      }
    };
  } catch (err: any) {
    return { success: false, error: `Supabase verification error: ${err.message}` };
  }
}

/**
 * Verify GitHub repository exists and is accessible
 */
export async function verifyGitHub(ctx: ProvisionContext): Promise<VerificationResult> {
  const repoName = ctx.metadata.githubRepoName;

  if (!repoName) {
    return { success: false, error: 'No GitHub repo name in metadata' };
  }

  try {
    const res = await fetch(`${GITHUB_API}/repos/${ctx.githubOwner}/${repoName}`, {
      headers: {
        Authorization: `Bearer ${ctx.githubToken}`,
        Accept: 'application/vnd.github+json',
      },
    });

    if (!res.ok) {
      return { success: false, error: `GitHub API returned ${res.status}` };
    }

    const repo = await res.json();

    // Verify essential files exist
    const configRes = await fetch(
      `${GITHUB_API}/repos/${ctx.githubOwner}/${repoName}/contents/config/client.ts`,
      {
        headers: {
          Authorization: `Bearer ${ctx.githubToken}`,
          Accept: 'application/vnd.github+json',
        },
      }
    );

    if (!configRes.ok) {
      return {
        success: false,
        error: 'config/client.ts not found in repository'
      };
    }

    return {
      success: true,
      details: {
        repoName,
        url: repo.html_url,
        defaultBranch: repo.default_branch
      }
    };
  } catch (err: any) {
    return { success: false, error: `GitHub verification error: ${err.message}` };
  }
}

/**
 * Verify Vercel project exists and deployment is ready
 */
export async function verifyVercel(ctx: ProvisionContext): Promise<VerificationResult> {
  const projectId = ctx.metadata.vercelProjectId;
  const vercelUrl = ctx.metadata.vercelUrl;

  if (!projectId) {
    return { success: false, error: 'No Vercel project ID in metadata' };
  }

  if (!vercelUrl) {
    return { success: false, error: 'No Vercel URL in metadata' };
  }

  const teamQuery = ctx.vercelTeamId ? `?teamId=${ctx.vercelTeamId}` : '';
  const teamQueryAmp = ctx.vercelTeamId ? `&teamId=${ctx.vercelTeamId}` : '';

  try {
    // Check project exists
    const projectRes = await fetch(`${VERCEL_API}/v9/projects/${projectId}${teamQuery}`, {
      headers: { Authorization: `Bearer ${ctx.vercelToken}` },
    });

    if (!projectRes.ok) {
      return { success: false, error: `Vercel project API returned ${projectRes.status}` };
    }

    // Check latest deployment status
    const deploymentsRes = await fetch(
      `${VERCEL_API}/v6/deployments?projectId=${projectId}${teamQueryAmp}&limit=1`,
      { headers: { Authorization: `Bearer ${ctx.vercelToken}` } }
    );

    if (!deploymentsRes.ok) {
      return { success: false, error: `Vercel deployments API returned ${deploymentsRes.status}` };
    }

    const { deployments } = await deploymentsRes.json();

    if (deployments.length === 0) {
      return { success: false, error: 'No deployments found' };
    }

    const deployment = deployments[0];

    if (deployment.readyState !== 'READY') {
      return {
        success: false,
        error: `Deployment state is ${deployment.readyState}, expected READY`
      };
    }

    // Actually hit the URL to verify it's responding
    try {
      const healthRes = await fetch(vercelUrl, {
        method: 'HEAD',
        redirect: 'follow',
      });

      if (!healthRes.ok && healthRes.status !== 308 && healthRes.status !== 307) {
        return {
          success: false,
          error: `Vercel URL returned ${healthRes.status}`
        };
      }
    } catch (fetchErr: any) {
      // URL might not be ready yet, but deployment is ready
      console.warn(`[verify] URL health check failed: ${fetchErr.message}`);
    }

    return {
      success: true,
      details: {
        projectId,
        deploymentId: deployment.uid,
        url: vercelUrl,
        readyState: deployment.readyState
      }
    };
  } catch (err: any) {
    return { success: false, error: `Vercel verification error: ${err.message}` };
  }
}

/**
 * Verify Vercel environment variables are set correctly
 */
export async function verifyVercelEnvVars(ctx: ProvisionContext): Promise<VerificationResult> {
  const projectId = ctx.metadata.vercelProjectId;

  if (!projectId) {
    return { success: false, error: 'No Vercel project ID' };
  }

  const teamQuery = ctx.vercelTeamId ? `?teamId=${ctx.vercelTeamId}` : '';

  try {
    const res = await fetch(`${VERCEL_API}/v10/projects/${projectId}/env${teamQuery}`, {
      headers: { Authorization: `Bearer ${ctx.vercelToken}` },
    });

    if (!res.ok) {
      return { success: false, error: `Vercel env API returned ${res.status}` };
    }

    const { envs } = await res.json();
    const envKeys = new Set(envs?.map((e: any) => e.key) || []);

    // Required env vars that must exist
    const requiredVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'NEXT_PUBLIC_ELEVENLABS_AGENT_ID',
      'ELEVENLABS_API_KEY',
    ];

    const missing = requiredVars.filter(v => !envKeys.has(v));

    if (missing.length > 0) {
      return {
        success: false,
        error: `Missing environment variables: ${missing.join(', ')}`
      };
    }

    // Verify NEXT_PUBLIC_ELEVENLABS_AGENT_ID has a value
    const agentIdEnv = envs?.find((e: any) => e.key === 'NEXT_PUBLIC_ELEVENLABS_AGENT_ID');
    if (!agentIdEnv?.value && ctx.metadata.elevenLabsAgentId) {
      return {
        success: false,
        error: 'NEXT_PUBLIC_ELEVENLABS_AGENT_ID is empty'
      };
    }

    return {
      success: true,
      details: {
        envCount: envs?.length || 0,
        hasAllRequired: true
      }
    };
  } catch (err: any) {
    return { success: false, error: `Vercel env verification error: ${err.message}` };
  }
}

/**
 * Verify ElevenLabs agent exists and is configured correctly
 */
export async function verifyElevenLabs(ctx: ProvisionContext): Promise<VerificationResult> {
  const agentId = ctx.metadata.elevenLabsAgentId;

  if (!agentId) {
    return { success: false, error: 'No ElevenLabs agent ID in metadata' };
  }

  try {
    // Fetch the specific agent to verify it exists
    const res = await fetch(`${ELEVENLABS_API}/convai/agents/${agentId}`, {
      headers: { 'xi-api-key': ctx.elevenLabsApiKey },
    });

    if (!res.ok) {
      if (res.status === 404) {
        return { success: false, error: `Agent ${agentId} not found` };
      }
      return { success: false, error: `ElevenLabs API returned ${res.status}` };
    }

    const agent = await res.json();

    // Log full structure for debugging
    console.log(`[verify] Agent name: ${agent.name}`);
    console.log(`[verify] Agent has platform_settings: ${!!agent.platform_settings}`);

    // Check different possible locations for tools
    const platformTools = agent.platform_settings?.tools || [];
    const conversationTools = agent.conversation_config?.agent?.tools || [];
    const allTools = [...platformTools, ...conversationTools];

    console.log(`[verify] platform_settings.tools count: ${platformTools.length}`);
    console.log(`[verify] conversation_config.agent.tools count: ${conversationTools.length}`);
    console.log(`[verify] All tool names: ${allTools.map((t: any) => t.name || t.tool_name || 'unnamed').join(', ') || 'none'}`);

    // Verify webhook URL is configured correctly
    const webhookUrl = agent.platform_settings?.webhook?.url;
    const expectedRouterUrl = `${ctx.publicBaseUrl}/api/webhooks/elevenlabs-router`;

    if (webhookUrl !== expectedRouterUrl) {
      console.warn(`[verify] Agent webhook URL mismatch. Expected: ${expectedRouterUrl}, Got: ${webhookUrl}`);
    }

    // Look for save_panel_draft tool in any location
    const saveDraftTool = allTools.find((t: any) =>
      t.name === 'save_panel_draft' || t.tool_name === 'save_panel_draft'
    );

    if (!saveDraftTool) {
      // This is now a warning, not a failure - we want to see what's happening
      console.warn(`[verify] save_panel_draft tool not found on agent`);
      console.warn(`[verify] Full platform_settings: ${JSON.stringify(agent.platform_settings, null, 2)}`);

      return {
        success: false,
        error: `save_panel_draft tool not configured on agent. Tools found: ${allTools.map((t: any) => t.name || t.tool_name).join(', ') || 'none'}`,
        details: {
          agentId,
          agentName: agent.name,
          platformToolsCount: platformTools.length,
          conversationToolsCount: conversationTools.length,
        }
      };
    }

    return {
      success: true,
      details: {
        agentId,
        agentName: agent.name,
        webhookConfigured: !!webhookUrl,
        toolsCount: allTools.length,
        hasSaveDraftTool: true,
      }
    };
  } catch (err: any) {
    return { success: false, error: `ElevenLabs verification error: ${err.message}` };
  }
}

/**
 * Verify child platform's Supabase has correct URL data
 */
export async function verifyChildSupabaseData(ctx: ProvisionContext): Promise<VerificationResult> {
  const supabaseUrl = ctx.metadata.supabaseUrl;
  const serviceKey = ctx.metadata.supabaseServiceKey;
  const anonKey = ctx.metadata.supabaseAnonKey;

  if (!supabaseUrl || !serviceKey) {
    return { success: false, error: 'Missing Supabase URL or service key' };
  }

  try {
    // Query the platforms table to verify data was written
    const res = await fetch(`${supabaseUrl}/rest/v1/platforms?id=eq.1&select=*`, {
      headers: {
        'apikey': anonKey || serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
    });

    if (!res.ok) {
      return { success: false, error: `Platforms query failed: ${res.status}` };
    }

    const platforms = await res.json();

    if (!platforms || platforms.length === 0) {
      return { success: false, error: 'No platform record found' };
    }

    const platform = platforms[0];

    // Verify required fields are populated
    const requiredFields = ['vercel_url', 'elevenlabs_agent_id'];
    const missingFields = requiredFields.filter(f => !platform[f]);

    if (missingFields.length > 0) {
      return {
        success: false,
        error: `Platform record missing fields: ${missingFields.join(', ')}`,
        details: { platform }
      };
    }

    // Verify the values match what we expect
    if (platform.vercel_url !== ctx.metadata.vercelUrl) {
      return {
        success: false,
        error: `Vercel URL mismatch. Expected: ${ctx.metadata.vercelUrl}, Got: ${platform.vercel_url}`
      };
    }

    if (platform.elevenlabs_agent_id !== ctx.metadata.elevenLabsAgentId) {
      return {
        success: false,
        error: `Agent ID mismatch. Expected: ${ctx.metadata.elevenLabsAgentId}, Got: ${platform.elevenlabs_agent_id}`
      };
    }

    return {
      success: true,
      details: {
        platformName: platform.name,
        vercelUrl: platform.vercel_url,
        agentId: platform.elevenlabs_agent_id
      }
    };
  } catch (err: any) {
    return { success: false, error: `Child Supabase verification error: ${err.message}` };
  }
}

/**
 * Run all verifications needed before marking as COMPLETE
 */
export async function verifyAllComplete(ctx: ProvisionContext): Promise<VerificationResult> {
  console.log('[verify] Running full verification suite...');

  const checks = [
    { name: 'Supabase', fn: verifySupabase },
    { name: 'GitHub', fn: verifyGitHub },
    { name: 'Vercel Deployment', fn: verifyVercel },
    { name: 'Vercel Env Vars', fn: verifyVercelEnvVars },
    { name: 'ElevenLabs Agent', fn: verifyElevenLabs },
    { name: 'Child Platform Data', fn: verifyChildSupabaseData },
  ];

  const results: Record<string, VerificationResult> = {};
  const failures: string[] = [];

  for (const check of checks) {
    console.log(`[verify] Checking ${check.name}...`);
    const result = await check.fn(ctx);
    results[check.name] = result;

    if (result.success) {
      console.log(`[verify] ✓ ${check.name} passed`);
    } else {
      console.error(`[verify] ✗ ${check.name} failed: ${result.error}`);
      failures.push(`${check.name}: ${result.error}`);
    }
  }

  if (failures.length > 0) {
    return {
      success: false,
      error: `Verification failed: ${failures.join('; ')}`,
      details: results,
    };
  }

  console.log('[verify] All verifications passed!');
  return { success: true, details: results };
}