// app/api/setup/create-vercel/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { projectName, githubRepo, envVars } = await request.json();

    if (!projectName || !githubRepo) {
      return NextResponse.json(
        { error: 'Project name and GitHub repo required' },
        { status: 400 }
      );
    }

    const vercelToken = process.env.VERCEL_TOKEN;
    const vercelTeamId = process.env.VERCEL_TEAM_ID;
    const githubOwner = process.env.GITHUB_TEMPLATE_OWNER || 'dennissolver';

    if (!vercelToken) {
      return NextResponse.json({ error: 'VERCEL_TOKEN not configured' }, { status: 500 });
    }

    const safeName = projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 100);
    const teamQuery = vercelTeamId ? `?teamId=${vercelTeamId}` : '';

    console.log('Creating Vercel project:', safeName);

    // Create Vercel project linked to GitHub
    const createRes = await fetch(`https://api.vercel.com/v10/projects${teamQuery}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${vercelToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: safeName,
        framework: 'nextjs',
        gitRepository: {
          type: 'github',
          repo: `${githubOwner}/${githubRepo}`,
        },
        buildCommand: 'npm run build',
        outputDirectory: '.next',
        installCommand: 'npm install',
      }),
    });

    if (!createRes.ok) {
      const error = await createRes.json();

      // If exists, get existing project
      if (error.error?.code === 'project_exists') {
        console.log('Project exists, fetching...');
        const existing = await getProject(vercelToken, safeName, vercelTeamId);
        if (existing) {
          await setEnvVars(vercelToken, existing.id, envVars, vercelTeamId);
          return NextResponse.json({
            success: true,
            projectId: existing.id,
            url: `https://${safeName}.vercel.app`,
            alreadyExists: true,
          });
        }
      }

      console.error('Vercel creation failed:', error);
      return NextResponse.json(
        { error: error.error?.message || 'Failed to create project' },
        { status: 400 }
      );
    }

    const project = await createRes.json();
    console.log('Vercel project created:', project.id);

    // Set environment variables
    if (envVars && Object.keys(envVars).length > 0) {
      await setEnvVars(vercelToken, project.id, envVars, vercelTeamId);
    }

    // Trigger deployment
    console.log('Triggering deployment...');
    const deployUrl = await triggerDeployment(vercelToken, safeName, project.id, githubOwner, githubRepo, vercelTeamId);

    return NextResponse.json({
      success: true,
      projectId: project.id,
      url: deployUrl || `https://${safeName}.vercel.app`,
      projectName: safeName,
    });

  } catch (error: any) {
    console.error('Create Vercel error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create Vercel project' },
      { status: 500 }
    );
  }
}

async function getProject(token: string, name: string, teamId?: string): Promise<any | null> {
  const teamQuery = teamId ? `?teamId=${teamId}` : '';
  const res = await fetch(`https://api.vercel.com/v9/projects/${name}${teamQuery}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.ok ? res.json() : null;
}

async function setEnvVars(
  token: string,
  projectId: string,
  envVars: Record<string, string>,
  teamId?: string
): Promise<void> {
  const teamQuery = teamId ? `?teamId=${teamId}` : '';

  for (const [key, value] of Object.entries(envVars)) {
    if (!value) continue;

    try {
      // Check if exists
      const getRes = await fetch(
        `https://api.vercel.com/v9/projects/${projectId}/env${teamQuery}&key=${key}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const existing = await getRes.json();
      const existingVar = existing.envs?.find((e: any) => e.key === key);

      if (existingVar) {
        // Update existing
        await fetch(
          `https://api.vercel.com/v9/projects/${projectId}/env/${existingVar.id}${teamQuery}`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              value,
              target: ['production', 'preview', 'development'],
            }),
          }
        );
      } else {
        // Create new
        await fetch(`https://api.vercel.com/v10/projects/${projectId}/env${teamQuery}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            key,
            value,
            type: key.includes('KEY') || key.includes('SECRET') ? 'encrypted' : 'plain',
            target: ['production', 'preview', 'development'],
          }),
        });
      }

      console.log(`Set env var: ${key}`);
    } catch (err) {
      console.warn(`Failed to set ${key}:`, err);
    }
  }
}

async function triggerDeployment(
  token: string,
  name: string,
  projectId: string,
  owner: string,
  repo: string,
  teamId?: string
): Promise<string | null> {
  try {
    const teamQuery = teamId ? `?teamId=${teamId}` : '';
    const res = await fetch(`https://api.vercel.com/v13/deployments${teamQuery}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        project: projectId,
        target: 'production',
        gitSource: {
          type: 'github',
          repo: `${owner}/${repo}`,
          ref: 'main',
        },
      }),
    });

    if (res.ok) {
      const deployment = await res.json();
      console.log('Deployment triggered:', deployment.id);
      return deployment.url ? `https://${deployment.url}` : null;
    }
  } catch (err) {
    console.warn('Deployment trigger failed:', err);
  }

  return null;
}
