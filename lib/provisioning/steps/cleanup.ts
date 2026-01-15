// lib/provisioning/steps/cleanup.ts

import { ProvisionContext, ProvisionStepResult } from '../types';

export async function cleanup(ctx: ProvisionContext): Promise<ProvisionStepResult> {
  const errors: string[] = [];

  if (ctx.metadata.elevenLabsAgentId) {
    try {
      await fetch(`https://api.elevenlabs.io/v1/convai/agents/${ctx.metadata.elevenLabsAgentId}`, {
        method: 'DELETE',
        headers: { 'xi-api-key': ctx.elevenLabsApiKey },
      });
    } catch (e: any) {
      errors.push(`ElevenLabs: ${e.message}`);
    }
  }

  if (ctx.metadata.vercelProjectId) {
    const teamQuery = ctx.vercelTeamId ? `?teamId=${ctx.vercelTeamId}` : '';
    try {
      await fetch(`https://api.vercel.com/v9/projects/${ctx.metadata.vercelProjectId}${teamQuery}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${ctx.vercelToken}` },
      });
    } catch (e: any) {
      errors.push(`Vercel: ${e.message}`);
    }
  }

  if (ctx.metadata.githubRepoName) {
    try {
      await fetch(`https://api.github.com/repos/${ctx.githubOwner}/${ctx.metadata.githubRepoName}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${ctx.githubToken}`, Accept: 'application/vnd.github+json' },
      });
    } catch (e: any) {
      errors.push(`GitHub: ${e.message}`);
    }
  }

  return {
    nextState: 'FAILED',
    metadata: { ...ctx.metadata, lastError: errors.length ? errors.join('; ') : 'Cleanup done' },
  };
}
