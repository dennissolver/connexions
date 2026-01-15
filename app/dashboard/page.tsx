// app/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Mic, Users, TrendingUp, Sparkles, ExternalLink, MessageSquare } from 'lucide-react';

interface Panel {
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
  agents: Panel[];
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
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-amber-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-violet-600">
          <div className="w-5 h-5 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
          Loading your dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-amber-50">
      {/* Header */}
      <div className="bg-white/70 backdrop-blur-sm border-b border-violet-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-200">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-500">Your interview panels</p>
            </div>
          </div>
          <Link
            href="/create"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-xl font-semibold shadow-lg shadow-violet-200 hover:shadow-xl hover:shadow-violet-300 transition-all"
          >
            <Plus className="w-4 h-4" />
            New Panel
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-6 border border-violet-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                <Mic className="w-5 h-5 text-violet-600" />
              </div>
              <span className="text-gray-500 text-sm font-medium">Interview Panels</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{metrics.total_agents}</div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-emerald-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="text-gray-500 text-sm font-medium">Total Interviews</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{metrics.total_interviews}</div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-amber-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-amber-600" />
              </div>
              <span className="text-gray-500 text-sm font-medium">Completed</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{metrics.completed_interviews}</div>
          </div>
        </div>

        {/* Panels List */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Your Interview Panels</h2>
            {metrics.agents.length > 0 && (
              <span className="text-sm text-gray-400">{metrics.agents.length} panels</span>
            )}
          </div>

          {metrics.agents.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-100 to-fuchsia-100 flex items-center justify-center mx-auto mb-6">
                <MessageSquare className="w-10 h-10 text-violet-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No panels yet</h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                Create your first interview panel to start collecting insights from customers, candidates, or users.
              </p>
              <Link
                href="/create"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-xl font-semibold shadow-lg shadow-violet-200 hover:shadow-xl hover:shadow-violet-300 transition-all"
              >
                <Sparkles className="w-4 h-4" />
                Create Your First Panel
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {metrics.agents.map((panel) => (
                <Link
                  key={panel.id}
                  href={`/agent/${panel.id}`}
                  className="flex items-center justify-between px-6 py-5 hover:bg-violet-50/50 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-400 to-fuchsia-400 flex items-center justify-center shadow-md">
                      <Mic className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 group-hover:text-violet-700 transition-colors">
                        {panel.name}
                      </div>
                      <div className="text-sm text-gray-400">/{panel.slug}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">
                        {panel.completed_interviews}/{panel.total_interviews}
                      </div>
                      <div className="text-xs text-gray-400">interviews</div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      panel.status === 'active' 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {panel.status}
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-violet-500 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Help Card */}
        <div className="mt-8 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-2xl p-6 text-white shadow-xl shadow-violet-200">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-lg mb-2">Need help designing a panel?</h3>
              <p className="text-violet-100 text-sm max-w-md">
                Chat with Sandra, your AI assistant, to design the perfect interview questions for your research goals.
              </p>
            </div>
            <Link
              href="/create"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-violet-600 rounded-xl font-semibold hover:bg-violet-50 transition-colors shrink-0"
            >
              <MessageSquare className="w-4 h-4" />
              Talk to Sandra
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}