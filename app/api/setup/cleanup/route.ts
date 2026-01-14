// app/api/setup/cleanup/route.ts
// ============================================================================
// CLEANUP - Rollback on failure
//
// Deletes any resources that were created during a failed setup
// Returns structured results matching frontend expectations
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';

const log = (msg: string) => console.log(`[Cleanup] ${msg}`);
const logError = (msg: string) => console.error(`[Cleanup] âŒ ${msg}`);

interface CleanupRequest {
  projectSlug?: string;
  companyName?: string;
  companyWebsite?: string;
  resources?: {
    supabase?: { projectId: string };
    github?: { repoName: string };
    vercel?: { projectId: string };
    elevenlabs?: { agentId: string };
  };
}

interface CleanupResult {
  component: string;
  verified: boolean;
  found: boolean;
  deleted: boolean;
  error?: string;
  attempts: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: CleanupRequest = await request.json();
    const { projectSlug, companyName, resources } = body;

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const results: CleanupResult[] = [];

    // Generate slug from company name if not provided
    const slug = projectSlug || (companyName
      ? companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)
      : null);

    log(`Starting cleanup for: ${slug || 'no slug provided'}`);

    // 1. Supabase
    const supabaseResult = await cleanupSupabase(baseUrl, slug, resources?.supabase?.projectId);
    results.push({
      component: 'Supabase',
      verified: supabaseResult.success,
      found: supabaseResult.found,
      deleted: supabaseResult.deleted,
      error: supabaseResult.error,
      attempts: 1,
    });

    // 2. GitHub
    const githubResult = await cleanupGitHub(baseUrl, slug, resources?.github?.repoName);
    results.push({
      component: 'GitHub',
      verified: githubResult.success,
      found: githubResult.found,
      deleted: githubResult.deleted,
      error: githubResult.error,
      attempts: 1,
    });

    // 3. Vercel
    const vercelResult = await cleanupVercel(baseUrl, slug, resources?.vercel?.projectId);
    results.push({
      component: 'Vercel',
      verified: vercelResult.success,
      found: vercelResult.found,
      deleted: vercelResult.deleted,
      error: vercelResult.error,
      attempts: 1,
    });

    // 4. ElevenLabs (uses projectSlug for unique agent naming)
    const elevenlabsResult = await cleanupElevenLabs(baseUrl, resources?.elevenlabs?.agentId, slug || undefined);
    results.push({
      component: 'ElevenLabs',
      verified: elevenlabsResult.success,
      found: elevenlabsResult.found,
      deleted: elevenlabsResult.deleted,
      error: elevenlabsResult.error,
      attempts: 1,
    });

    const allVerifiedDeleted = results.every((r) => r.verified);
    const deletedCount = results.filter((r) => r.deleted).length;
    const notFoundCount = results.filter((r) => !r.found).length;

    log(`Cleanup complete: ${deletedCount} deleted, ${notFoundCount} not found, all verified: ${allVerifiedDeleted}`);

    return NextResponse.json({
      success: allVerifiedDeleted,
      allVerifiedDeleted,
      results,
      summary: {
        deleted: deletedCount,
        notFound: notFoundCount,
        failed: results.filter((r) => !r.verified).length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logError(message);

    return NextResponse.json(
      {
        success: false,
        allVerifiedDeleted: false,
        error: message,
        results: [
          { component: 'Supabase', verified: false, found: false, deleted: false, error: message, attempts: 1 },
          { component: 'GitHub', verified: false, found: false, deleted: false, error: message, attempts: 1 },
          { component: 'Vercel', verified: false, found: false, deleted: false, error: message, attempts: 1 },
          { component: 'ElevenLabs', verified: false, found: false, deleted: false, error: message, attempts: 1 },
        ],
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// CLEANUP FUNCTIONS
// ============================================================================

interface CleanupServiceResult {
  success: boolean;
  found: boolean;
  deleted: boolean;
  error?: string;
}

async function cleanupSupabase(baseUrl: string, slug: string | null, projectId?: string): Promise<CleanupServiceResult> {
  try {
    if (!projectId && !slug) {
      return { success: true, found: false, deleted: false };
    }

    const idToDelete = projectId || slug;
    log(`Checking Supabase for: ${idToDelete}`);

    const res = await fetch(`${baseUrl}/api/setup/create-supabase`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: idToDelete, projectRef: idToDelete }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.status === 404 || data.alreadyDeleted) {
      return { success: true, found: false, deleted: false };
    }

    if (res.ok || data.success) {
      return { success: true, found: true, deleted: true };
    }

    return { success: false, found: true, deleted: false, error: data.error };
  } catch (e) {
    return { success: true, found: false, deleted: false };
  }
}

async function cleanupGitHub(baseUrl: string, slug: string | null, repoName?: string): Promise<CleanupServiceResult> {
  try {
    const nameToDelete = repoName || slug;
    if (!nameToDelete) {
      return { success: true, found: false, deleted: false };
    }

    log(`Checking GitHub for: ${nameToDelete}`);

    const res = await fetch(`${baseUrl}/api/setup/create-github`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoName: nameToDelete }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.status === 404 || data.alreadyDeleted) {
      return { success: true, found: false, deleted: false };
    }

    if (res.ok || data.success) {
      return { success: true, found: true, deleted: true };
    }

    return { success: false, found: true, deleted: false, error: data.error };
  } catch (e) {
    return { success: true, found: false, deleted: false };
  }
}

async function cleanupVercel(baseUrl: string, slug: string | null, projectId?: string): Promise<CleanupServiceResult> {
  try {
    const idToDelete = projectId || slug;
    if (!idToDelete) {
      return { success: true, found: false, deleted: false };
    }

    log(`Checking Vercel for: ${idToDelete}`);

    const res = await fetch(`${baseUrl}/api/setup/create-vercel`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: idToDelete, projectName: idToDelete }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.status === 404 || data.alreadyDeleted) {
      return { success: true, found: false, deleted: false };
    }

    if (res.ok || data.success) {
      return { success: true, found: true, deleted: true };
    }

    return { success: false, found: true, deleted: false, error: data.error };
  } catch (e) {
    return { success: true, found: false, deleted: false };
  }
}

async function cleanupElevenLabs(baseUrl: string, agentId?: string, projectSlug?: string): Promise<CleanupServiceResult> {
  try {
    // If we have an agentId, delete directly
    if (agentId) {
      log(`Deleting ElevenLabs agent by ID: ${agentId}`);

      const res = await fetch(`${baseUrl}/api/setup/create-elevenlabs`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 404 || data.alreadyDeleted) {
        return { success: true, found: false, deleted: false };
      }

      if (res.ok || data.success) {
        return { success: true, found: true, deleted: true };
      }

      return { success: false, found: true, deleted: false, error: data.error };
    }

    // No agentId - search by name pattern using projectSlug
    if (!projectSlug) {
      return { success: true, found: false, deleted: false };
    }

    // Agent name format matches create-elevenlabs route
    const agentDisplayName = `${projectSlug}-setup-agent`;
    log(`Searching ElevenLabs for agent: ${agentDisplayName}`);

    const elevenlabsApiKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenlabsApiKey) {
      log('No ELEVENLABS_API_KEY configured, skipping');
      return { success: true, found: false, deleted: false };
    }

    // List all agents and find matching one
    const listRes = await fetch('https://api.elevenlabs.io/v1/convai/agents', {
      headers: { 'xi-api-key': elevenlabsApiKey },
    });

    if (!listRes.ok) {
      return { success: true, found: false, deleted: false };
    }

    const data = await listRes.json();
    const existingAgent = data.agents?.find((a: any) => a.name === agentDisplayName);

    if (!existingAgent) {
      log(`No ElevenLabs agent found with name: ${agentDisplayName}`);
      return { success: true, found: false, deleted: false };
    }

    log(`Found ElevenLabs agent: ${existingAgent.agent_id}, deleting...`);

    // Delete the agent
    const deleteRes = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${existingAgent.agent_id}`, {
      method: 'DELETE',
      headers: { 'xi-api-key': elevenlabsApiKey },
    });

    if (deleteRes.ok || deleteRes.status === 404) {
      log(`Deleted ElevenLabs agent: ${existingAgent.agent_id}`);
      return { success: true, found: true, deleted: true };
    }

    const error = await deleteRes.json().catch(() => ({}));
    return { success: false, found: true, deleted: false, error: error.detail || 'Delete failed' };

  } catch (e) {
    return { success: true, found: false, deleted: false };
  }
}
