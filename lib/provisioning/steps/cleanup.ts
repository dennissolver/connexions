// lib/provisioning/steps/cleanup.ts

import { ProvisionContext, ProvisionStepResult } from '../types';

const SUPABASE_API = 'https://api.supabase.com/v1';
const VERCEL_API = 'https://api.vercel.com';
const GITHUB_API = 'https://api.github.com';
const ELEVENLABS_API = 'https://api.elevenlabs.io/v1';

export async function cleanup(ctx: ProvisionContext): Promise<ProvisionStepResult> {
  const errors: string[] = [];
  const deleted: string[] = [];

  // Delete ElevenLabs agent
  if (ctx.metadata.elevenLabsAgentId) {
    try {
      const res = await fetch(`${ELEVENLABS_API}/convai/agents/${ctx.metadata.elevenLabsAgentId}`, {
        method: 'DELETE',
        headers: { 'xi-api-key': ctx.elevenLabsApiKey },
      });
      if (res.ok || res.status === 404) {
        deleted.push('ElevenLabs agent');
      } else {
        errors.push(`ElevenLabs: ${res.status}`);
      }
    } catch (e: any) {
      errors.push(`ElevenLabs: ${e.message}`);
    }
  }

  // Delete Vercel project
  if (ctx.metadata.vercelProjectId) {
    const teamQuery = ctx.vercelTeamId ? `?teamId=${ctx.vercelTeamId}` : '';
    try {
      const res = await fetch(`${VERCEL_API}/v9/projects/${ctx.metadata.vercelProjectId}${teamQuery}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${ctx.vercelToken}` },
      });
      if (res.ok || res.status === 404) {
        deleted.push('Vercel project');
      } else {
        errors.push(`Vercel: ${res.status}`);
      }
    } catch (e: any) {
      errors.push(`Vercel: ${e.message}`);
    }
  }

  // Delete GitHub repo
  if (ctx.metadata.githubRepoName) {
    try {
      const res = await fetch(`${GITHUB_API}/repos/${ctx.githubOwner}/${ctx.metadata.githubRepoName}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${ctx.githubToken}`, Accept: 'application/vnd.github+json' },
      });
      if (res.ok || res.status === 404) {
        deleted.push('GitHub repo');
      } else {
        errors.push(`GitHub: ${res.status}`);
      }
    } catch (e: any) {
      errors.push(`GitHub: ${e.message}`);
    }
  }

  // Delete Supabase project
  if (ctx.metadata.supabaseProjectRef) {
    try {
      const res = await fetch(`${SUPABASE_API}/projects/${ctx.metadata.supabaseProjectRef}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${ctx.supabaseToken}` },
      });
      if (res.ok || res.status === 404) {
        deleted.push('Supabase project');
      } else {
        errors.push(`Supabase: ${res.status}`);
      }
    } catch (e: any) {
      errors.push(`Supabase: ${e.message}`);
    }
  }

  console.log(`[cleanup] Deleted: ${deleted.join(', ') || 'nothing'}`);
  if (errors.length) console.error(`[cleanup] Errors: ${errors.join(', ')}`);

  return {
    nextState: 'FAILED',
    metadata: {
      ...ctx.metadata,
      cleanupCompleted: true,
      cleanupDeleted: deleted,
      cleanupErrors: errors.length ? errors : undefined,
    },
  };
}

// Standalone function to fully delete a provisioned platform
export async function deleteProvisionedPlatform(ctx: ProvisionContext): Promise<{ deleted: string[]; errors: string[] }> {
  const result = await cleanup(ctx);
  return {
    deleted: result.metadata?.cleanupDeleted || [],
    errors: result.metadata?.cleanupErrors || [],
  };
}