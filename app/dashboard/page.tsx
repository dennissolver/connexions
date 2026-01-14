import EmptyDashboard from '@/app/components/dashboard/EmptyDashboard';

export const dynamic = 'force-dynamic';

type DashboardResponse = {
  totals: {
    total_agents: number;
    total_interviews: number;
    total_minutes: number;
  };
  is_empty: boolean;
};

async function getDashboardData(): Promise<DashboardResponse> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/dashboard/performance`,
    { cache: 'no-store' }
  );

  if (!res.ok) {
    return {
      totals: {
        total_agents: 0,
        total_interviews: 0,
        total_minutes: 0,
      },
      is_empty: true,
    };
  }

  return res.json();
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  if (data.is_empty) {
    return <EmptyDashboard />;
  }

  const { total_agents, total_interviews, total_minutes } = data.totals;

  return (
    <div className="grid grid-cols-3 gap-6">
      <Metric title="Agents" value={total_agents} />
      <Metric title="Interviews" value={total_interviews} />
      <Metric title="Minutes" value={total_minutes} />
    </div>
  );
}

function Metric({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-xl border p-6">
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className="text-3xl font-semibold">{value}</div>
    </div>
  );
}
