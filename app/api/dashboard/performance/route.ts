import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = supabaseAdmin;

  const [
    agentsRes,
    interviewsRes,
    minutesRes,
  ] = await Promise.all([
    supabase.from('agents').select('*', { count: 'exact', head: true }),
    supabase.from('interviews').select('*', { count: 'exact', head: true }),
    supabase.from('interviews').select('duration_minutes'),
  ]);

  const totalMinutes =
    minutesRes.data?.reduce(
      (sum, row) => sum + (row.duration_minutes ?? 0),
      0
    ) ?? 0;

  const totalAgents = agentsRes.count ?? 0;
  const totalInterviews = interviewsRes.count ?? 0;

  return NextResponse.json({
    totals: {
      total_agents: totalAgents,
      total_interviews: totalInterviews,
      total_minutes: totalMinutes,
    },
    is_empty: totalAgents === 0 && totalInterviews === 0,
  });
}
