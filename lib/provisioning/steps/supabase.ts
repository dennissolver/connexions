import { generatePassword } from '@/lib/security/passwords';

/**
 * Supabase provisioning steps
 * ----------------------------
 * Pure, idempotent functions.
 * No HTTP routes. No orchestration. No retries.
 */

const SUPABASE_API = 'https://api.supabase.com/v1';

export interface SupabaseProjectInfo {
  projectRef: string;
  supabaseUrl: string;
  anonKey: string;
  serviceKey: string;
  created: boolean;
}

/**
 * Create (or find) a Supabase project by name.
 */
export async function createSupabaseProject(
  token: string,
  orgId: string,
  platformName: string
): Promise<{ projectRef: string; created: boolean }> {
  const safeName = platformName
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .slice(0, 40);

  const listRes = await fetch(`${SUPABASE_API}/projects`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!listRes.ok) {
    throw new Error('Failed to list Supabase projects');
  }

  const projects = await listRes.json();
  const existing = projects.find((p: any) => p.name === safeName);

  if (existing) {
    return { projectRef: existing.id, created: false };
  }

  const createRes = await fetch(`${SUPABASE_API}/projects`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: safeName,
      organization_id: orgId,
      region: 'ap-southeast-2',
      plan: 'free',
      db_pass: generatePassword(),
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Supabase create failed: ${err}`);
  }

  const project = await createRes.json();
  return { projectRef: project.id, created: true };
}

/**
 * Check if the Supabase project is ready.
 * Single check only — no loops.
 */
export async function isSupabaseReady(
  token: string,
  projectRef: string
): Promise<boolean> {
  const res = await fetch(`${SUPABASE_API}/projects/${projectRef}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return false;

  const project = await res.json();
  return project.status === 'ACTIVE_HEALTHY';
}

/**
 * Fetch API keys.
 */
export async function fetchSupabaseKeys(
  token: string,
  projectRef: string
): Promise<{ anonKey: string; serviceKey: string }> {
  const res = await fetch(
    `${SUPABASE_API}/projects/${projectRef}/api-keys`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to fetch API keys: ${err}`);
  }

  const keys = await res.json();

  const anonKey = keys.find((k: any) => k.name === 'anon')?.api_key;
  const serviceKey = keys.find(
    (k: any) => k.name === 'service_role'
  )?.api_key;

  if (!anonKey || !serviceKey) {
    throw new Error('Missing Supabase API keys');
  }

  return { anonKey, serviceKey };
}

/**
 * Run schema migration (idempotent).
 */
export async function runSupabaseMigration(
  token: string,
  projectRef: string,
  schemaSql: string
): Promise<void> {
  const res = await fetch(
    `${SUPABASE_API}/projects/${projectRef}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: schemaSql }),
    }
  );

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Schema migration failed: ${error}`);
  }
}

/**
 * Configure Supabase auth URLs.
 */
export async function configureSupabaseAuth(
  token: string,
  projectRef: string,
  publicBaseUrl: string
): Promise<void> {
  const siteUrl = publicBaseUrl.replace(/\/$/, '');
  const redirectUrl = `${siteUrl}/auth/callback`;

  const res = await fetch(
    `${SUPABASE_API}/projects/${projectRef}/config/auth`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        site_url: siteUrl,
        uri_allow_list: redirectUrl,
        redirect_urls: redirectUrl,
      }),
    }
  );

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Auth config failed: ${error}`);
  }
}

/**
 * Create storage buckets (idempotent).
 */
export async function createSupabaseBuckets(
  supabaseUrl: string,
  serviceKey: string
): Promise<void> {
  const buckets = [
    { name: 'transcripts', public: false },
    { name: 'recordings', public: false },
    { name: 'exports', public: false },
    { name: 'assets', public: true },
    { name: 'attachments', public: false },
  ];

  for (const bucket of buckets) {
    const res = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        apikey: serviceKey,
      },
      body: JSON.stringify({
        id: bucket.name,
        name: bucket.name,
        public: bucket.public,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      if (!text.includes('already exists')) {
        throw new Error(`Bucket ${bucket.name} failed: ${text}`);
      }
    }
  }
}
