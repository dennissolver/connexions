// lib/provisioning/steps/cleanup.ts

export async function cleanupProvisioning(metadata: any) {
  // ---- Vercel cleanup ----
  if (metadata?.vercelProjectId) {
    try {
      await fetch(
        `https://api.vercel.com/v9/projects/${metadata.vercelProjectId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
          },
        }
      );
    } catch (err) {
      console.warn('[Cleanup] Vercel cleanup failed', err);
    }
  }

  // ---- Supabase cleanup ----
  if (metadata?.supabaseProjectId) {
    try {
      await fetch(
        `https://api.supabase.com/v1/projects/${metadata.supabaseProjectId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,
          },
        }
      );
    } catch (err) {
      console.warn('[Cleanup] Supabase cleanup failed', err);
    }
  }

  // ---- GitHub cleanup ----
  if (metadata?.githubRepo) {
    try {
      await fetch(
        `https://api.github.com/repos/${metadata.githubRepo}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          },
        }
      );
    } catch (err) {
      console.warn('[Cleanup] GitHub cleanup failed', err);
    }
  }
}

