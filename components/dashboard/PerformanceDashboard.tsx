// components/dashboard/PerformanceDashboard.tsx

import { DashboardMetrics } from '@/types/dashboard';

interface Props {
  metrics: DashboardMetrics;
}

export default function PerformanceDashboard({ metrics }: Props) {
  const safe = {
    total_agents: metrics.total_agents ?? 0,
    total_interviews: metrics.total_interviews ?? 0,
    total_minutes: metrics.total_minutes ?? 0,
  };

  return (
    <div className="grid grid-cols-3 gap-6">
      <Stat label="Agents" value={safe.total_agents} />
      <Stat label="Interviews" value={safe.total_interviews} />
      <Stat label="Minutes" value={safe.total_minutes} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-6">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-3xl font-semibold">{value}</div>
    </div>
  );
}
