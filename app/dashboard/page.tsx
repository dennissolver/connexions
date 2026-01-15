// app/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Bot, Users, MessageSquare } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  slug: string;
  status: string;
  total_interviews: number;
  completed_interviews: number;
  created_at: string;
}

interface DashboardMetrics {
  total_agents: number;
  total_interviews: number;
  completed_interviews: number;
  agents: Agent[];
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    total_agents: 0,
    total_interviews: 0,
    completed_interviews: 0,
    agents: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/performance')
      .then(r => r.json())
      .then(d => setMetrics(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-neutral-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="max-w-6xl mx-auto px-6 py-12">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold">Dashboard</h1>
            <p className="text-neutral-400 mt-1">Manage your AI interview agents</p>
          </div>
          <Link
            href="/setup"
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg font-medium transition"
          >
            <Plus className="w-4 h-4" />
            Create Platform
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Bot className="w-5 h-5 text-purple-400" />
              <span className="text-neutral-400 text-sm">Total Agents</span>
            </div>
            <div className="text-3xl font-semibold">{metrics.total_agents}</div>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-green-400" />
              <span className="text-neutral-400 text-sm">Total Interviews</span>
            </div>
            <div className="text-3xl font-semibold">{metrics.total_interviews}</div>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <MessageSquare className="w-5 h-5 text-blue-400" />
              <span className="text-neutral-400 text-sm">Completed</span>
            </div>
            <div className="text-3xl font-semibold">{metrics.completed_interviews}</div>
          </div>
        </div>

        {/* Agents List */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl">
          <div className="px-6 py-4 border-b border-neutral-800">
            <h2 className="font-semibold">Your Agents</h2>
          </div>

          {metrics.agents.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Bot className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
              <p className="text-neutral-400 mb-4">No agents yet</p>
              <Link
                href="/setup"
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg font-medium transition"
              >
                <Plus className="w-4 h-4" />
                Create your first platform
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-neutral-800">
              {metrics.agents.map((agent) => (
                <Link
                  key={agent.id}
                  href={`/agent/${agent.id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-neutral-800/50 transition"
                >
                  <div>
                    <div className="font-medium">{agent.name}</div>
                    <div className="text-sm text-neutral-400">/{agent.slug}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm">
                      {agent.completed_interviews} / {agent.total_interviews} interviews
                    </div>
                    <div className={`text-xs ${agent.status === 'active' ? 'text-green-400' : 'text-neutral-500'}`}>
                      {agent.status}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}