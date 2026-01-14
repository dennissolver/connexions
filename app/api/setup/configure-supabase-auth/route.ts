// app/api/setup/configure-supabase-auth/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { projectRef, siteUrl } = await request.json();

    if (!projectRef || !siteUrl) {
      return NextResponse.json(
        { error: 'Project ref and site URL required' },
        { status: 400 }
      );
    }

    const supabaseAccessToken = process.env.SUPABASE_ACCESS_TOKEN;

    const redirectUrls = [
      'http://localhost:3000/**',
      `${siteUrl}/**`,
      `${siteUrl}/auth/callback`,
      `${siteUrl}/auth/confirm`,
    ];

    if (!supabaseAccessToken) {
      return NextResponse.json({
        success: false,
        partial: true,
        message: 'SUPABASE_ACCESS_TOKEN not set. Configure manually.',
        requiredUrls: redirectUrls,
        instructions: [
          '1. Go to Supabase Dashboard â†’ Authentication â†’ URL Configuration',
          `2. Set Site URL: ${siteUrl}`,
          '3. Add Redirect URLs:',
          ...redirectUrls.map(url => `   â€¢ ${url}`),
        ],
      });
    }

    console.log('Configuring Supabase auth for:', siteUrl);

    const res = await fetch(
      `https://api.supabase.com/v1/projects/${projectRef}/config/auth`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${supabaseAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          site_url: siteUrl,
          uri_allow_list: redirectUrls.join(','),
        }),
      }
    );

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      console.error('Auth config failed:', error);

      return NextResponse.json({
        success: false,
        partial: true,
        message: 'API call failed. Configure manually in Supabase Dashboard.',
        requiredUrls: redirectUrls,
      });
    }

    console.log('Supabase auth configured successfully');

    return NextResponse.json({
      success: true,
      message: 'Auth URLs configured',
      siteUrl,
      redirectUrls,
    });

  } catch (error: any) {
    console.error('Configure auth error:', error);
    return NextResponse.json(
      { success: false, partial: true, error: error.message },
      { status: 500 }
    );
  }
}

