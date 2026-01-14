
// lib/provisioning/steps/github.ts
const GITHUB_API = 'https://api.github.com';

export async function createGithubRepo(
  token: string,
  repoName: string,
  org: string
): Promise<{ repoFullName: string }> {
  const res = await fetch(`${GITHUB_API}/orgs/${org}/repos`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: repoName,
      private: true,
      auto_init: true,
    }),
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  const data = await res.json();
  return { repoFullName: data.full_name };
}

