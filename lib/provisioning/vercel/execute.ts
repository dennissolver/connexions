// lib/provisioning/vercel/execute.ts
// Creates Vercel project - DEPENDS ON: github (needs repo)
// Dependency check happens in engine/registry, not here

import { ProvisionContext, StepResult } from '../types';

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;

export async function vercelExecute(ctx: ProvisionContext): Promise<StepResult> {
  // Already have a project? Skip (idempotent)
  if (ctx.metadata.vercel_project_id) {
    console.log(`[vercel.execute] Already exists: ${ctx.metadata.vercel_project_id}`);
    return { status: 'advance' };
  }

  if (!VERCEL_TOKEN) {
    return {
      status: 'fail',
      error: 'VERCEL_TOKEN not configured',
    };
  }

  // GitHub repo is required (dependency enforced by registry)
  const githubRepo = ctx.metadata.github_repo as string;
  if (!githubRepo) {
    // This shouldn't happen if dependencies are checked, but be safe
    return {
      status: 'wait',
    };
  }

  const projectName = `cx-${ctx.projectSlug}`;

  try {
    // Check if already exists
    const checkUrl = new URL(`https://api.vercel.com/v9/projects/${projectName}`);
    if (VERCEL_TEAM_ID) checkUrl.searchParams.set('teamId', VERCEL_TEAM_ID);

    const checkRes = await fetch(checkUrl.toString(), {
      headers: {
        'Authorization': `Bearer ${VERCEL_TOKEN}`,
      },
    });

    if (checkRes.ok) {
      const existing = await checkRes.json();
      console.log(`[vercel.execute] Found existing: ${existing.id}`);
      return {
        status: 'advance',
        metadata: {
          vercel_project_id: existing.id,
          vercel_url: `https://${projectName}.vercel.app`,
        },
      };
    }

    // Build environment variables
    const envVars = [];
    if (ctx.metadata.supabase_url) {
      envVars.push({ key: 'NEXT_PUBLIC_SUPABASE_URL', value: ctx.metadata.supabase_url, target: ['production', 'preview', 'development'] });
    }
    if (ctx.metadata.supabase_anon_key) {
      envVars.push({ key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', value: ctx.metadata.supabase_anon_key, target: ['production', 'preview', 'development'] });
    }
    if (ctx.metadata.supabase_service_role_key) {
      envVars.push({ key: 'SUPABASE_SERVICE_ROLE_KEY', value: ctx.metadata.supabase_service_role_key, target: ['production', 'preview', 'development'] });
    }

    // Create project
    const createUrl = new URL('https://api.vercel.com/v10/projects');
    if (VERCEL_TEAM_ID) createUrl.searchParams.set('teamId', VERCEL_TEAM_ID);

    const createRes = await fetch(createUrl.toString(), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: projectName,
        framework: 'nextjs',
        gitRepository: {
          repo: githubRepo,
          type: 'github',
        },
        environmentVariables: envVars,
      }),
    });

    if (!createRes.ok) {
      const text = await createRes.text();
      return {
        status: 'fail',
        error: `Vercel API error (${createRes.status}): ${text}`,
      };
    }

    const project = await createRes.json();
    console.log(`[vercel.execute] Created: ${project.id}`);

    return {
      status: 'advance',
      metadata: {
        vercel_project_id: project.id,
        vercel_url: `https://${projectName}.vercel.app`,
      },
    };
  } catch (err) {
    return {
      status: 'fail',
      error: `Vercel creation failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
