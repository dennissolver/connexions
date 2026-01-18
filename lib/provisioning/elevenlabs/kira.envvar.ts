// lib/provisioning/elevenlabs/kira.envvar.ts
// Adds Kira agent ID to child platform's Vercel environment variables
// DEPENDS ON: kira (agent created), vercel (project exists)

import { ProvisionContext, StepResult } from '../types';

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;

export async function kiraEnvVarExecute(ctx: ProvisionContext): Promise<StepResult> {
  const kiraAgentId = ctx.metadata.kira_agent_id as string;
  const vercelProjectId = ctx.metadata.vercel_project_id as string;

  if (!kiraAgentId) {
    return { status: 'wait' }; // Wait for Kira to be created
  }

  if (!vercelProjectId) {
    return { status: 'wait' }; // Wait for Vercel project
  }

  if (!VERCEL_TOKEN) {
    return {
      status: 'fail',
      error: 'VERCEL_TOKEN not configured',
    };
  }

  // Check if already set
  if (ctx.metadata.kira_env_var_set) {
    console.log(`[kira.envvar] Already set`);
    return { status: 'advance' };
  }

  try {
    // Add NEXT_PUBLIC_KIRA_AGENT_ID to child's Vercel project
    const res = await fetch(
      `https://api.vercel.com/v10/projects/${vercelProjectId}/env${VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : ''}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${VERCEL_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: 'NEXT_PUBLIC_KIRA_AGENT_ID',
          value: kiraAgentId,
          type: 'plain',
          target: ['production', 'preview', 'development'],
        }),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      // If it already exists, that's fine
      if (text.includes('already exists')) {
        console.log(`[kira.envvar] Env var already exists, updating...`);

        // Update existing
        const updateRes = await fetch(
          `https://api.vercel.com/v9/projects/${vercelProjectId}/env/NEXT_PUBLIC_KIRA_AGENT_ID${VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : ''}`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${VERCEL_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              value: kiraAgentId,
              target: ['production', 'preview', 'development'],
            }),
          }
        );

        if (!updateRes.ok) {
          const updateText = await updateRes.text();
          return {
            status: 'fail',
            error: `Failed to update env var: ${updateText}`,
          };
        }
      } else {
        return {
          status: 'fail',
          error: `Vercel API error (${res.status}): ${text}`,
        };
      }
    }

    console.log(`[kira.envvar] Set NEXT_PUBLIC_KIRA_AGENT_ID=${kiraAgentId}`);

    return {
      status: 'advance',
      metadata: {
        kira_env_var_set: true,
      },
    };
  } catch (err) {
    return {
      status: 'fail',
      error: `Failed to set Kira env var: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export async function kiraEnvVarVerify(ctx: ProvisionContext): Promise<StepResult> {
  const vercelProjectId = ctx.metadata.vercel_project_id as string;
  const kiraAgentId = ctx.metadata.kira_agent_id as string;

  if (!vercelProjectId || !kiraAgentId) {
    return { status: 'wait' };
  }

  try {
    // Fetch env vars and check if NEXT_PUBLIC_KIRA_AGENT_ID is set correctly
    const res = await fetch(
      `https://api.vercel.com/v9/projects/${vercelProjectId}/env${VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : ''}`,
      {
        headers: {
          Authorization: `Bearer ${VERCEL_TOKEN}`,
        },
      }
    );

    if (!res.ok) {
      return { status: 'wait' };
    }

    const data = await res.json();
    const kiraEnv = data.envs?.find((e: any) => e.key === 'NEXT_PUBLIC_KIRA_AGENT_ID');

    if (!kiraEnv) {
      console.log(`[kira.envvar.verify] Env var not found`);
      return { status: 'wait' };
    }

    // Note: Vercel doesn't return the actual value for security, just check it exists
    console.log(`[kira.envvar.verify] Verified NEXT_PUBLIC_KIRA_AGENT_ID exists`);

    return { status: 'advance' };
  } catch (err) {
    console.log(`[kira.envvar.verify] Error, will retry: ${err}`);
    return { status: 'wait' };
  }
}