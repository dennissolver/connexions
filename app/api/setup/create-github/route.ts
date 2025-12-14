// app/api/setup/create-github/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { repoName, formData, createdResources } = await request.json();

    if (!repoName) {
      return NextResponse.json({ error: 'Repository name required' }, { status: 400 });
    }

    const githubToken = process.env.GITHUB_TOKEN;
    const templateOwner = process.env.GITHUB_TEMPLATE_OWNER || 'dennissolver';
    const templateRepo = process.env.GITHUB_TEMPLATE_REPO || 'aiagentinterviewer';

    if (!githubToken) {
      return NextResponse.json({ error: 'GITHUB_TOKEN not configured' }, { status: 500 });
    }

    const safeName = repoName.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 100);

    console.log('Creating GitHub repository:', safeName);

    // Create repo from template
    const createRes = await fetch(
      `https://api.github.com/repos/${templateOwner}/${templateRepo}/generate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({
          owner: templateOwner,
          name: safeName,
          description: `AI Interview Agent for ${formData?.companyName || repoName}`,
          private: false,
          include_all_branches: false,
        }),
      }
    );

    if (!createRes.ok) {
      const error = await createRes.json();

      // If exists, use existing
      if (error.message?.includes('already exists')) {
        console.log('Repository already exists, using existing');
        return NextResponse.json({
          success: true,
          repoUrl: `https://github.com/${templateOwner}/${safeName}`,
          repoName: safeName,
          alreadyExists: true,
        });
      }

      console.error('GitHub creation failed:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to create repository' },
        { status: 400 }
      );
    }

    const repo = await createRes.json();
    console.log('GitHub repository created:', repo.html_url);

    // Wait for repo initialization
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Update .env.example with client values
    if (createdResources) {
      await updateEnvFile(githubToken, templateOwner, safeName, {
        NEXT_PUBLIC_SUPABASE_URL: createdResources.supabaseUrl || '',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: createdResources.supabaseAnonKey || '',
        ELEVENLABS_SETUP_AGENT_ID: createdResources.elevenlabsAgentId || '',
        NEXT_PUBLIC_COMPANY_NAME: formData?.companyName || '',
      });
    }

    return NextResponse.json({
      success: true,
      repoUrl: repo.html_url,
      repoName: safeName,
      fullName: repo.full_name,
    });

  } catch (error: any) {
    console.error('Create GitHub error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create repository' },
      { status: 500 }
    );
  }
}

async function updateEnvFile(
  token: string,
  owner: string,
  repo: string,
  envVars: Record<string, string>
): Promise<void> {
  try {
    // Get existing .env.example
    const getRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/.env.example`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
        },
      }
    );

    if (!getRes.ok) {
      console.log('No .env.example found, skipping update');
      return;
    }

    const file = await getRes.json();
    let content = Buffer.from(file.content, 'base64').toString('utf-8');

    // Update values
    for (const [key, value] of Object.entries(envVars)) {
      if (value) {
        const regex = new RegExp(`^${key}=.*$`, 'm');
        if (content.match(regex)) {
          content = content.replace(regex, `${key}=${value}`);
        } else {
          content += `\n${key}=${value}`;
        }
      }
    }

    // Commit updated file
    await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/.env.example`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
        },
        body: JSON.stringify({
          message: 'Configure environment for client',
          content: Buffer.from(content).toString('base64'),
          sha: file.sha,
        }),
      }
    );

    console.log('.env.example updated');
  } catch (err) {
    console.warn('Could not update .env.example:', err);
  }
}
