import { ProvisionContext, ProvisionStepResult } from '../types';
// lib/provisioning/steps/createVercelProject.ts

export async function createVercelProject(
  ctx: ProvisionContext
): Promise<ProvisionStepResult> {
  if (ctx.metadata.vercelProjectId) {
    return {
      nextState: 'CONFIGURE_AUTH',
      metadata: ctx.metadata,
    };
  }

  // ðŸ”’ REAL CALL GOES HERE
  // const project = await vercel.projects.create(...)

  const vercelProjectId = `vercel_${ctx.projectSlug}`;

  return {
    nextState: 'CONFIGURE_AUTH',
    metadata: {
      ...ctx.metadata,
      vercelProjectId,
    },
  };
}

