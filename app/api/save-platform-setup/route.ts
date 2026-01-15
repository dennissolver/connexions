// app/api/setup/save-platform-setup/route.ts.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Use the master Supabase (not the client's)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn('Master Supabase not configured, skipping save');
      return NextResponse.json({ success: true, skipped: true });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Save to platform_setups table
    const { data: setup, error } = await supabase
      .from('platform_setups')
      .insert({
        company_name: data.companyName,
        company_email: data.companyEmail,
        company_website: data.companyWebsite,
        admin_name: `${data.adminFirstName} ${data.adminLastName}`.trim(),
        admin_email: data.adminEmail,
        admin_phone: data.adminPhone,
        agent_name: data.agentName,
        voice_gender: data.voiceGender,
        supabase_project_id: data.supabaseProjectId,
        supabase_url: data.supabaseUrl,
        elevenlabs_agent_id: data.elevenlabsAgentId,
        github_repo_url: data.githubRepoUrl,
        vercel_project_id: data.vercelProjectId,
        vercel_url: data.vercelUrl,
        status: data.status || 'completed',
        full_config: data,
        completed_at: data.status === 'completed' ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to save platform setup:', error);
      // Don't fail the whole setup if this fails
      return NextResponse.json({ success: false, error: error.message });
    }

    console.log('Platform setup saved:', setup.id);

    return NextResponse.json({
      success: true,
      setupId: setup.id,
    });

  } catch (error: any) {
    console.error('Save platform setup error:', error);
    return NextResponse.json({ success: false, error: error.message });
  }
}

