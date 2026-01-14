import { ProvisionContext, ProvisionStepResult } from '../types';
// lib/provisioning/steps/configureElevenLabs.ts

export async function configureElevenLabs(
  ctx: ProvisionContext
): Promise<ProvisionStepResult> {
  if (ctx.metadata.elevenLabsConfigured) {
    return {
      nextState: 'FINALISE',
      metadata: ctx.metadata,
    };
  }

  // ðŸ”’ REAL CALL GOES HERE
  // await elevenlabs.projects.configure(...)

  return {
    nextState: 'FINALISE',
    metadata: {
      ...ctx.metadata,
      elevenLabsConfigured: true,
    },
  };
}

