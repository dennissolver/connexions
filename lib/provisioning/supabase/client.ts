// lib/provisioning/supabase/client.ts
// Supabase Management API client for provisioning operations

const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN!;
const SUPABASE_ORG_ID = process.env.SUPABASE_ORG_ID!;

const BASE_URL = 'https://api.supabase.com/v1';

interface SupabaseProject {
  id: string;
  organization_id: string;
  name: string;
  region: string;
  created_at: string;
  database: {
    host: string;
    version: string;
  };
  status: string;
}

interface CreateProjectParams {
  name: string;
  organization_id: string;
  region: string;
  db_pass: string;
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase API error (${res.status}): ${text}`);
  }

  return res.json();
}

export async function createProject(params: CreateProjectParams): Promise<SupabaseProject> {
  return apiRequest<SupabaseProject>('/projects', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function getProject(projectRef: string): Promise<SupabaseProject | null> {
  try {
    return await apiRequest<SupabaseProject>(`/projects/${projectRef}`);
  } catch (err) {
    // Not found returns 404
    return null;
  }
}

export async function getProjectApiKeys(projectRef: string): Promise<{ anon: string; service_role: string } | null> {
  try {
    const keys = await apiRequest<Array<{ name: string; api_key: string }>>(`/projects/${projectRef}/api-keys`);
    const anon = keys.find(k => k.name === 'anon')?.api_key;
    const serviceRole = keys.find(k => k.name === 'service_role')?.api_key;

    if (!anon || !serviceRole) return null;

    return { anon, service_role: serviceRole };
  } catch {
    return null;
  }
}

export async function isProjectReady(projectRef: string): Promise<boolean> {
  const project = await getProject(projectRef);
  return project?.status === 'ACTIVE_HEALTHY';
}

export function getProjectUrl(projectRef: string): string {
  return `https://${projectRef}.supabase.co`;
}

export function getOrganizationId(): string {
  return SUPABASE_ORG_ID;
}
