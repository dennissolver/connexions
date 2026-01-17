// lib/provisioning/vercel/client.ts
// Vercel API client for deployment provisioning

const VERCEL_TOKEN = process.env.VERCEL_TOKEN!;
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;

const BASE_URL = 'https://api.vercel.com';

interface VercelProject {
  id: string;
  name: string;
  accountId: string;
  link?: {
    type: string;
    repo: string;
  };
}

interface VercelDeployment {
  id: string;
  url: string;
  state: string;
  readyState: string;
}

function buildUrl(endpoint: string): string {
  const url = new URL(`${BASE_URL}${endpoint}`);
  if (VERCEL_TEAM_ID) {
    url.searchParams.set('teamId', VERCEL_TEAM_ID);
  }
  return url.toString();
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(buildUrl(endpoint), {
    ...options,
    headers: {
      'Authorization': `Bearer ${VERCEL_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Vercel API error (${res.status}): ${text}`);
  }

  return res.json();
}

export async function createProject(params: {
  name: string;
  gitRepository: {
    repo: string;
    type: 'github';
  };
  environmentVariables?: Array<{
    key: string;
    value: string;
    target: string[];
  }>;
}): Promise<VercelProject> {
  return apiRequest<VercelProject>('/v10/projects', {
    method: 'POST',
    body: JSON.stringify({
      name: params.name,
      gitRepository: params.gitRepository,
      framework: 'nextjs',
      environmentVariables: params.environmentVariables,
    }),
  });
}

export async function getProject(projectId: string): Promise<VercelProject | null> {
  try {
    return await apiRequest<VercelProject>(`/v9/projects/${projectId}`);
  } catch {
    return null;
  }
}

export async function getProjectByName(name: string): Promise<VercelProject | null> {
  try {
    return await apiRequest<VercelProject>(`/v9/projects/${name}`);
  } catch {
    return null;
  }
}

export async function getLatestDeployment(projectId: string): Promise<VercelDeployment | null> {
  try {
    const response = await apiRequest<{ deployments: VercelDeployment[] }>(
      `/v6/deployments?projectId=${projectId}&limit=1`
    );
    return response.deployments[0] || null;
  } catch {
    return null;
  }
}

export async function setEnvironmentVariables(
  projectId: string,
  envVars: Array<{ key: string; value: string; target: string[] }>
): Promise<void> {
  for (const envVar of envVars) {
    await apiRequest(`/v10/projects/${projectId}/env`, {
      method: 'POST',
      body: JSON.stringify(envVar),
    });
  }
}

export function getDeploymentUrl(projectName: string): string {
  return `https://${projectName}.vercel.app`;
}
