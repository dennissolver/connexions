import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { DEFAULT_DASHBOARD_METRICS } from '@/lib/dashboard/defaultMetrics';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get('clientId');

  if (!clientId) {
    return NextResponse.json(DEFAULT_DASHBOARD_METRICS);
  }

  const { count, error } = await supabaseAdmin
    .from('agents')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', clientId);

  if (error) {
    return NextResponse.json(DEFAULT_DASHBOARD_METRICS);
  }

  return NextResponse.json({
    total_agents: count ?? 0,
  });
}
