// app/api/dashboard/performance/route.ts.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Get all agents with their interview counts
    const { data: agents, error: agentsError } = await supabaseAdmin
      .from('agents')
      .select('id, name, slug, status, total_interviews, completed_interviews, created_at')
      .order('created_at', { ascending: false });

    if (agentsError) {
      console.error('Error fetching agents:', agentsError);
      return NextResponse.json({
        total_agents: 0,
        total_interviews: 0,
        completed_interviews: 0,
        agents: [],
      });
    }

    // Calculate totals
    const total_agents = agents?.length ?? 0;
    const total_interviews = agents?.reduce((sum, a) => sum + (a.total_interviews ?? 0), 0) ?? 0;
    const completed_interviews = agents?.reduce((sum, a) => sum + (a.completed_interviews ?? 0), 0) ?? 0;

    return NextResponse.json({
      total_agents,
      total_interviews,
      completed_interviews,
      agents: agents ?? [],
    });
  } catch (err) {
    console.error('Dashboard performance error:', err);
    return NextResponse.json({
      total_agents: 0,
      total_interviews: 0,
      completed_interviews: 0,
      agents: [],
    });
  }
}