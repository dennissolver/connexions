// lib/provisioning/steps/vercel.ts
const VERCEL_API = 'https://api.vercel.com';

export async function createVercelProject(
  token: string,
  projectName: string,
  gitRepo: string
): Promise<{ projectId: string }> {
  const res = await fetch(`${VERCEL_API}/v10/projects`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: projectName,
      gitRepository: {
        type: 'github',
        repo: gitRepo,
      },
    }),
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  const data = await res.json();
  return { projectId: data.id };
}

export async function triggerVercelDeployment(
  token: string,
  projectId: string
): Promise<void> {
  const res = await fetch(`${VERCEL_API}/v13/deployments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      projectId,
      name: projectId,
    }),
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }
}

