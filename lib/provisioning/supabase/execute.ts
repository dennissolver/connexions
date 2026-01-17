// lib/provisioning/supabase/execute.ts
// Creates the Supabase project - idempotent

import { ProvisionContext, StepResult } from '../types';
import { createProject, getProject, getOrganizationId, getProjectUrl } from './client';
import { generatePassword } from '../../security/passwords';

export async function supabaseExecute(ctx: ProvisionContext): Promise<StepResult> {
  // Already have a project ref? Skip creation (idempotent)
  if (ctx.metadata.supabase_project_ref) {
    console.log(`[supabase.execute] Project already exists: ${ctx.metadata.supabase_project_ref}`);
    return {
      status: 'advance',
      metadata: ctx.metadata,
    };
  }

  try {
    // Generate a secure database password
    const dbPass = generatePassword(32);

    // Create the project
    const project = await createProject({
      name: `cx-${ctx.projectSlug}`,
      organization_id: getOrganizationId(),
      region: 'us-east-1', // Could be configurable
      db_pass: dbPass,
    });

    console.log(`[supabase.execute] Created project: ${project.id}`);

    return {
      status: 'advance',
      metadata: {
        supabase_project_ref: project.id,
        supabase_url: getProjectUrl(project.id),
        supabase_db_pass: dbPass, // Store encrypted in production
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[supabase.execute] Failed:`, msg);

    return {
      status: 'fail',
      error: `Supabase creation failed: ${msg}`,
    };
  }
}
