'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_DASHBOARD_METRICS } from '@/lib/dashboard/defaultMetrics';

export default function DashboardPage() {
  const [metrics, setMetrics] = useState(DEFAULT_DASHBOARD_METRICS);

  useEffect(() => {
    fetch('/api/dashboard/performance')
      .then(r => r.json())
      .then(d => setMetrics({ ...DEFAULT_DASHBOARD_METRICS, ...d }))
      .catch(() => setMetrics(DEFAULT_DASHBOARD_METRICS));
  }, []);

  return (
    <div className='p-6 space-y-4'>
      <h1 className='text-xl font-semibold'>Dashboard</h1>
      <div>Total agents: {metrics.total_agents}</div>
    </div>
  );
}
