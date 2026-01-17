// lib/provisioning/vercel/execute.ts
// Creates Vercel project linked to GitHub - idempotent

import { ProvisionContext, StepResult } from '../types';
import { createProject, getProjectByName, setEnvironmentVariables, getDeploymentUrl } from './client';

export async function vercelExecute(ctx: ProvisionContext): Promise<StepResult> {
  const projectName = `cx-${ctx.projectSlug}`;

  // Already have a project? Skip creation (idempotent)
  if (ctx.metadata.vercel_project_id) {
    console.log(`[vercel.execute] Project already exists: ${ctx.metadata.vercel_project_id}`);
    return {
      status: 'advance',
      metadata: ctx.metadata,
    };
  }

  // Need GitHub repo first
  if (!ctx.metadata.github_repo) {
    return {
      status: 'fail',
      error: 'GitHub repo required before Vercel deployment',
    };
  }

  try {
    // Check if project already exists
    const existing = await getProjectByName(projectName);
    if (existing) {
      console.log(`[vercel.execute] Found existing project: ${existing.id}`);
      return {
        status: 'advance',
        metadata: {
          vercel_project_id: existing.id,
          vercel_url: getDeploymentUrl(projectName),
        },
      };
    }

    // Build environment variables
    const envVars = [
      { key: 'NEXT_PUBLIC_SUPABASE_URL', value: ctx.metadata.supabase_url as string, target: ['production', 'preview', 'development'] },
      { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', value: ctx.metadata.supabase_anon_key as string, target: ['production', 'preview', 'development'] },
      { key: 'SUPABASE_SERVICE_ROLE_KEY', value: ctx.metadata.supabase_service_role_key as string, target: ['production', 'preview', 'development'] },
    ].filter(v => v.value); // Only include if value exists

    // Create project
    const project = await createProject({
      name: projectName,
      gitRepository: {
        repo: ctx.metadata.github_repo as string,
        type: 'github',
      },
      environmentVariables: envVars,
    });

    console.log(`[vercel.execute] Created project: ${project.id}`);

    return {
      status: 'advance',
      metadata: {
        vercel_project_id: project.id,
        vercel_url: getDeploymentUrl(projectName),
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[vercel.execute] Failed:`, msg);

    return {
      status: 'fail',
      error: `Vercel project creation failed: ${msg}`,
    };
  }
}
