// components/dashboard/PerformanceDashboard.tsx
'use client';

import { useState, useEffect } from 'react';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  RefreshCw,
  ChevronRight,
  Bell
} from 'lucide-react';

interface AgentPerformance {
  id: string;
  name: string;
  slug: string;
  company_name: string;
  total_interviews: number;
  completed_interviews: number;
  evaluated_interviews: number;
  avg_score: number | null;
  health: 'healthy' | 'needs_attention' | 'critical' | 'no_data';
  trend: 'improving' | 'stable' | 'declining' | null;
  open_alerts: number;
  last_evaluation: string | null;
  score_breakdown: {
    goal_achievement: number;
    conversation_quality: number;
    user_engagement: number;
    prompt_adherence: number;
  } | null;
}

interface PlatformStats {
  total_agents: number;
  healthy: number;
  needs_attention: number;
  critical: number;
  avg_score: number | null;
  open_alerts: number;
}

interface DashboardData {
  period: { days: number; start_date: string; end_date: string };
  platform: PlatformStats;
  agents: AgentPerformance[];
}

interface PerformanceDashboardProps {
  onAgentSelect?: (agentId: string) => void;
}

export function PerformanceDashboard({ onAgentSelect }: PerformanceDashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(7);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/performance?days=${days}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError('Failed to load performance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [days]);

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-400';
      case 'needs_attention': return 'text-yellow-400';
      case 'critical': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getHealthBg = (health: string) => {
    switch (health) {
      case 'healthy': return 'bg-green-500/20 border-green-500/30';
      case 'needs_attention': return 'bg-yellow-500/20 border-yellow-500/30';
      case 'critical': return 'bg-red-500/20 border-red-500/30';
      default: return 'bg-gray-500/20 border-gray-500/30';
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy': return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'needs_attention': return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'critical': return <XCircle className="w-5 h-5 text-red-400" />;
      default: return <Minus className="w-5 h-5 text-gray-400" />;
    }
  };

  const getTrendIcon = (trend: string | null) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="w-4 h-4 text-green-400" />;
      case 'declining': return <TrendingDown className="w-4 h-4 text-red-400" />;
      default: return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <p className="text-gray-400">{error || 'No data available'}</p>
        <button 
          onClick={fetchData}
          className="mt-4 px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Agent Performance</h1>
          <p className="text-gray-400 text-sm mt-1">
            Monitoring {data.platform.total_agents} agents
          </p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button
            onClick={fetchData}
            className="p-2 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700"
          >
            <RefreshCw className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Platform Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
            <Activity className="w-4 h-4" />
            Platform Score
          </div>
          <div className="text-3xl font-bold text-white">
            {data.platform.avg_score !== null ? `${data.platform.avg_score}%` : '—'}
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
            <CheckCircle className="w-4 h-4 text-green-400" />
            Healthy
          </div>
          <div className="text-3xl font-bold text-green-400">
            {data.platform.healthy}
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            Needs Attention
          </div>
          <div className="text-3xl font-bold text-yellow-400">
            {data.platform.needs_attention}
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
            <Bell className="w-4 h-4 text-red-400" />
            Open Alerts
          </div>
          <div className="text-3xl font-bold text-red-400">
            {data.platform.open_alerts}
          </div>
        </div>
      </div>

      {/* Agents List */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700">
          <h2 className="font-semibold text-white">All Agents</h2>
        </div>
        <div className="divide-y divide-slate-700">
          {data.agents.map((agent) => (
            <div
              key={agent.id}
              onClick={() => onAgentSelect?.(agent.id)}
              className="px-4 py-4 hover:bg-slate-700/50 cursor-pointer transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {getHealthIcon(agent.health)}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{agent.name}</span>
                      {agent.open_alerts > 0 && (
                        <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">
                          {agent.open_alerts} alert{agent.open_alerts > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-400">
                      {agent.company_name} • {agent.evaluated_interviews} evaluated
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {/* Score Breakdown Mini */}
                  {agent.score_breakdown && (
                    <div className="hidden md:flex items-center gap-3 text-xs">
                      <div className="text-center">
                        <div className="text-gray-500">Goals</div>
                        <div className={agent.score_breakdown.goal_achievement >= 70 ? 'text-green-400' : 'text-yellow-400'}>
                          {agent.score_breakdown.goal_achievement}%
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-gray-500">Quality</div>
                        <div className={agent.score_breakdown.conversation_quality >= 70 ? 'text-green-400' : 'text-yellow-400'}>
                          {agent.score_breakdown.conversation_quality}%
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-gray-500">Engage</div>
                        <div className={agent.score_breakdown.user_engagement >= 70 ? 'text-green-400' : 'text-yellow-400'}>
                          {agent.score_breakdown.user_engagement}%
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Overall Score */}
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <span className={`text-2xl font-bold ${getHealthColor(agent.health)}`}>
                        {agent.avg_score !== null ? `${agent.avg_score}%` : '—'}
                      </span>
                      {getTrendIcon(agent.trend)}
                    </div>
                  </div>

                  <ChevronRight className="w-5 h-5 text-gray-500" />
                </div>
              </div>

              {/* Score Bar */}
              {agent.avg_score !== null && (
                <div className="mt-3 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      agent.avg_score >= 80 ? 'bg-green-500' :
                      agent.avg_score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${agent.avg_score}%` }}
                  />
                </div>
              )}
            </div>
          ))}

          {data.agents.length === 0 && (
            <div className="px-4 py-12 text-center text-gray-400">
              No agents with evaluations yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PerformanceDashboard;
