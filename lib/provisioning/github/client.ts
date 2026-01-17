// lib/provisioning/github/client.ts
// GitHub API client for repository provisioning

const GITHUB_TOKEN = process.env.GITHUB_TOKEN!;
const GITHUB_ORG = process.env.GITHUB_ORG || 'connexions-platforms';
const TEMPLATE_REPO = process.env.GITHUB_TEMPLATE_REPO || 'universal-interviews';

const BASE_URL = 'https://api.github.com';

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  clone_url: string;
  default_branch: string;
}

interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
  };
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API error (${res.status}): ${text}`);
  }

  return res.json();
}

export async function createRepoFromTemplate(
  repoName: string,
  description: string
): Promise<GitHubRepo> {
  return apiRequest<GitHubRepo>(`/repos/${GITHUB_ORG}/${TEMPLATE_REPO}/generate`, {
    method: 'POST',
    body: JSON.stringify({
      owner: GITHUB_ORG,
      name: repoName,
      description,
      private: true,
      include_all_branches: false,
    }),
  });
}

export async function getRepo(repoName: string): Promise<GitHubRepo | null> {
  try {
    return await apiRequest<GitHubRepo>(`/repos/${GITHUB_ORG}/${repoName}`);
  } catch {
    return null;
  }
}

export async function getLatestCommit(repoName: string): Promise<GitHubCommit | null> {
  try {
    const commits = await apiRequest<GitHubCommit[]>(
      `/repos/${GITHUB_ORG}/${repoName}/commits?per_page=1`
    );
    return commits[0] || null;
  } catch {
    return null;
  }
}

export async function fileExists(repoName: string, filePath: string): Promise<boolean> {
  try {
    await apiRequest(`/repos/${GITHUB_ORG}/${repoName}/contents/${filePath}`);
    return true;
  } catch {
    return false;
  }
}

export function getRepoFullName(repoName: string): string {
  return `${GITHUB_ORG}/${repoName}`;
}
