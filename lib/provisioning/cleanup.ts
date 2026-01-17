// lib/provisioning/cleanup.ts
// Deletes all provisioned resources for a project slug
// Called before re-provisioning an existing slug

import { ProvisionContext, ProvisionMetadata } from './types';
import { getProvisionRunBySlug, deleteProvisionRunBySlug } from './store';

const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

interface CleanupResult {
  slug: string;
  deleted: {
    supabase: boolean;
    github: boolean;
    vercel: boolean;
    sandra: boolean;
    kira: boolean;
    database: boolean;
  };
  errors: string[];
}

/**
 * Delete all provisioned resources for a project slug.
 * Call this before re-provisioning to ensure clean state.
 */
export async function cleanupProvisionedPlatform(projectSlug: string): Promise<CleanupResult> {
  const result: CleanupResult = {
    slug: projectSlug,
    deleted: {
      supabase: false,
      github: false,
      vercel: false,
      sandra: false,
      kira: false,
      database: false,
    },
    errors: [],
  };

  // Get existing run to find resource IDs
  const existingRun = await getProvisionRunBySlug(projectSlug);

  if (!existingRun) {
    console.log(`[cleanup] No existing run found for ${projectSlug}`);
    return result;
  }

  const metadata = existingRun.metadata;
  console.log(`[cleanup] Starting cleanup for ${projectSlug}`);

  // Delete in reverse order of dependencies

  // 1. Delete ElevenLabs agents
  if (metadata.sandra_agent_id) {
    try {
      await deleteElevenLabsAgent(metadata.sandra_agent_id as string);
      result.deleted.sandra = true;
      console.log(`[cleanup] Deleted Sandra agent: ${metadata.sandra_agent_id}`);
    } catch (err) {
      result.errors.push(`Sandra: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (metadata.kira_agent_id) {
    try {
      await deleteElevenLabsAgent(metadata.kira_agent_id as string);
      result.deleted.kira = true;
      console.log(`[cleanup] Deleted Kira agent: ${metadata.kira_agent_id}`);
    } catch (err) {
      result.errors.push(`Kira: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 2. Delete Vercel project
  if (metadata.vercel_project_id) {
    try {
      await deleteVercelProject(metadata.vercel_project_id as string);
      result.deleted.vercel = true;
      console.log(`[cleanup] Deleted Vercel project: ${metadata.vercel_project_id}`);
    } catch (err) {
      result.errors.push(`Vercel: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 3. Delete GitHub repo
  if (metadata.github_repo) {
    try {
      await deleteGitHubRepo(metadata.github_repo as string);
      result.deleted.github = true;
      console.log(`[cleanup] Deleted GitHub repo: ${metadata.github_repo}`);
    } catch (err) {
      result.errors.push(`GitHub: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 4. Delete Supabase project
  if (metadata.supabase_project_ref) {
    try {
      await deleteSupabaseProject(metadata.supabase_project_ref as string);
      result.deleted.supabase = true;
      console.log(`[cleanup] Deleted Supabase project: ${metadata.supabase_project_ref}`);
    } catch (err) {
      result.errors.push(`Supabase: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 5. Delete database row
  try {
    await deleteProvisionRunBySlug(projectSlug);
    result.deleted.database = true;
    console.log(`[cleanup] Deleted provision run record`);
  } catch (err) {
    result.errors.push(`Database: ${err instanceof Error ? err.message : String(err)}`);
  }

  console.log(`[cleanup] Cleanup complete for ${projectSlug}:`, result);
  return result;
}

/**
 * Check if a project slug already exists
 */
export async function projectSlugExists(projectSlug: string): Promise<boolean> {
  const run = await getProvisionRunBySlug(projectSlug);
  return run !== null;
}

// =============================================================================
// DELETE FUNCTIONS
// =============================================================================

async function deleteSupabaseProject(projectRef: string): Promise<void> {
  if (!SUPABASE_ACCESS_TOKEN) {
    throw new Error('SUPABASE_ACCESS_TOKEN not configured');
  }

  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
    },
  });

  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    throw new Error(`Supabase API error (${res.status}): ${text}`);
  }
}

async function deleteGitHubRepo(repoFullName: string): Promise<void> {
  if (!GITHUB_TOKEN) {
    throw new Error('GITHUB_TOKEN not configured');
  }

  const res = await fetch(`https://api.github.com/repos/${repoFullName}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  });

  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    throw new Error(`GitHub API error (${res.status}): ${text}`);
  }
}

async function deleteVercelProject(projectId: string): Promise<void> {
  if (!VERCEL_TOKEN) {
    throw new Error('VERCEL_TOKEN not configured');
  }

  const url = new URL(`https://api.vercel.com/v9/projects/${projectId}`);
  if (VERCEL_TEAM_ID) url.searchParams.set('teamId', VERCEL_TEAM_ID);

  const res = await fetch(url.toString(), {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${VERCEL_TOKEN}`,
    },
  });

  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    throw new Error(`Vercel API error (${res.status}): ${text}`);
  }
}

async function deleteElevenLabsAgent(agentId: string): Promise<void> {
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY not configured');
  }

  const res = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
    method: 'DELETE',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY,
    },
  });

  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    throw new Error(`ElevenLabs API error (${res.status}): ${text}`);
  }
}
