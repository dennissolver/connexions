// app/dashboard/page.tsx
// Main evaluation dashboard page

'use client';

import { useState } from 'react';
import { PerformanceDashboard } from '@/components/dashboard/PerformanceDashboard';
import { AgentDrilldown } from '@/components/dashboard/AgentDrilldown';

export default function DashboardPage() {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {selectedAgent ? (
          <AgentDrilldown
            agentId={selectedAgent}
            onBack={() => setSelectedAgent(null)}
          />
        ) : (
          <PerformanceDashboard
            onAgentSelect={(id) => setSelectedAgent(id)}
          />
        )}
      </div>
    </div>
  );
}

