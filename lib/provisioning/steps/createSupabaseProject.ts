import { ProvisionContext, ProvisionStepResult } from '../types';
// lib/provisioning/steps/createSupabaseProject.ts

export async function createSupabaseProject(
  ctx: ProvisionContext
): Promise<ProvisionStepResult> {
  if (ctx.metadata.supabaseProjectId) {
    return {
      nextState: 'CREATE_PROJECT',
      metadata: ctx.metadata,
    };
  }

  // ðŸ”’ REAL CALL GOES HERE
  // const project = await supabaseManagement.projects.create(...)

  const fakeProjectId = `sb_${ctx.projectSlug}`;

  return {
    nextState: 'CREATE_PROJECT',
    metadata: {
      ...ctx.metadata,
      supabaseProjectId: fakeProjectId,
    },
  };
}

