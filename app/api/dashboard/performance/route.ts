// app/api/dashboard/performance/route.ts

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { data, error } = await supabaseAdmin
      .from('dashboard_performance')
      .select(
        `
        total_agents,
        total_interviews,
        total_minutes
        `
      )
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[dashboard/performance] query error', error);
    }

    /**
     * 🔒 HARD GUARANTEED RESPONSE SHAPE
     * These keys ALWAYS exist
     */
    return NextResponse.json({
      total_agents: Number(data?.total_agents ?? 0),
      total_interviews: Number(data?.total_interviews ?? 0),
      total_minutes: Number(data?.total_minutes ?? 0),
    });
  } catch (err) {
    console.error('[dashboard/performance] fatal error', err);

    // Even on failure, NEVER break the UI
    return NextResponse.json({
      total_agents: 0,
      total_interviews: 0,
      total_minutes: 0,
    });
  }
}
