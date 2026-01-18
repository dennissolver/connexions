// lib/provisioning/vercel/execute.ts
// Creates Vercel project - DEPENDS ON: github, supabase (needs repo + keys)

import { ProvisionContext, StepResult } from '../types';

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;

// Env vars to copy from parent Connexions to child platforms
const PARENT_ENV_VARS = [
  'ELEVENLABS_API_KEY',
  'ELEVENLABS_WEBHOOK_SECRET',
  'ANTHROPIC_API_KEY',
  'TOOL_SHARED_SECRET',
];

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
    return { status: 'wait' };
  }

  // Supabase keys are required (dependency enforced by registry)
  if (!ctx.metadata.supabase_url || !ctx.metadata.supabase_anon_key || !ctx.metadata.supabase_service_role_key) {
    console.log(`[vercel.execute] Waiting for Supabase keys`);
    return { status: 'wait' };
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
    const envVars: Array<{ key: string; value: string; target: string[]; type: string }> = [];

    // Supabase vars (public ones as plain, secret as encrypted)
    envVars.push({
      key: 'NEXT_PUBLIC_SUPABASE_URL',
      value: ctx.metadata.supabase_url as string,
      target: ['production', 'preview', 'development'],
      type: 'plain',
    });
    envVars.push({
      key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      value: ctx.metadata.supabase_anon_key as string,
      target: ['production', 'preview', 'development'],
      type: 'plain',
    });
    envVars.push({
      key: 'SUPABASE_SERVICE_ROLE_KEY',
      value: ctx.metadata.supabase_service_role_key as string,
      target: ['production', 'preview', 'development'],
      type: 'encrypted',
    });

    // Copy parent env vars to child
    for (const key of PARENT_ENV_VARS) {
      const value = process.env[key];
      if (value) {
        envVars.push({
          key,
          value,
          target: ['production', 'preview', 'development'],
          type: 'encrypted',
        });
      }
    }

    // Add platform-specific vars
    envVars.push({
      key: 'NEXT_PUBLIC_PLATFORM_NAME',
      value: ctx.platformName,
      target: ['production', 'preview', 'development'],
      type: 'plain',
    });
    envVars.push({
      key: 'NEXT_PUBLIC_COMPANY_NAME',
      value: ctx.companyName,
      target: ['production', 'preview', 'development'],
      type: 'plain',
    });

    // Internal API key for create-panel endpoint
    envVars.push({
      key: 'INTERNAL_API_KEY',
      value: 'internal-create-panel',
      target: ['production', 'preview', 'development'],
      type: 'encrypted',
    });

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

    // Trigger initial deployment since Git commit happened before project was created
    await triggerDeployment(project.id, githubRepo);

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

async function triggerDeployment(projectId: string, githubRepo: string): Promise<void> {
  try {
    const deployUrl = new URL('https://api.vercel.com/v13/deployments');
    if (VERCEL_TEAM_ID) deployUrl.searchParams.set('teamId', VERCEL_TEAM_ID);

    const res = await fetch(deployUrl.toString(), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: projectId,
        project: projectId,
        gitSource: {
          type: 'github',
          repo: githubRepo,
          ref: 'main',
        },
        target: 'production',
      }),
    });

    if (res.ok) {
      console.log(`[vercel.execute] Triggered deployment for ${projectId}`);
    } else {
      const text = await res.text();
      console.log(`[vercel.execute] Deployment trigger failed (non-fatal): ${text}`);
      // Non-fatal - Git integration might trigger it anyway
    }
  } catch (err) {
    console.log(`[vercel.execute] Deployment trigger error (non-fatal): ${err}`);
  }
}