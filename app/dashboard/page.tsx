// app/dashboard/page.tsx

import { DashboardMetrics } from '@/types/dashboard';
import PerformanceDashboard from '@/components/dashboard/PerformanceDashboard';

export const dynamic = 'force-dynamic';

async function getMetrics(): Promise<DashboardMetrics> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/dashboard/performance`,
    {
      cache: 'no-store',
    }
  );

  if (!res.ok) {
    return {
      total_agents: 0,
      total_interviews: 0,
      total_minutes: 0,
    };
  }

  const data = (await res.json()) as DashboardMetrics;

  return {
    total_agents: data?.total_agents ?? 0,
    total_interviews: data?.total_interviews ?? 0,
    total_minutes: data?.total_minutes ?? 0,
  };
}

export default async function DashboardPage() {
  const metrics = await getMetrics();

  return <PerformanceDashboard metrics={metrics} />;
}
