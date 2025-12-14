// components/admin/SuperAdminDashboard.tsx
// SUPERADMIN: Platform operator view across ALL clients and agents
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
  Bell,
  Users,
  Building2,
  Bot,
  BarChart3,
  Filter,
  Eye,
} from 'lucide-react';

interface Client {
  id: string;
  email: string;
  name: string;
  company_name: string;
  subscription_tier: string;
  total_agents: number;
  active_agents: number;
  total_evaluations: number;
  avg_score: number | null;
  open_alerts: number;
  health: string;
  agents: AgentPerformance[];
}

interface AgentPerformance {
  id: string;
  name: string;
  slug: string;
  company_name: string;
  status: string;
  client: { id: string; email: string; name: string; company_name: string } | null;
  total_interviews: number;
  completed_interviews: number;
  evaluated_interviews: number;
  avg_score: number | null;
  health: string;
  open_alerts: number;
  issue_summary: Record<string, number>;
  score_breakdown: {
    goal_achievement: number;
    conversation_quality: number;
    user_engagement: number;
    prompt_adherence: number;
  } | null;
}

interface Alert {
  id: string;
  agent_id: string;
  alert_type: string;
  severity: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  agents: { name: string; slug: string; client_id: string };
}

interface PlatformStats {
  total_clients: number;
  total_agents: number;
  active_agents: number;
  total_evaluations: number;
  total_interviews: number;
  platform_avg_score: number | null;
  health_breakdown: {
    healthy: number;
    needs_attention: number;
    critical: number;
    no_data: number;
  };
  total_open_alerts: number;
  top_issues: Array<{ type: string; count: number }>;
}

interface DashboardData {
  period: { days: number };
  platform: PlatformStats;
  clients: Client[];
  agents: AgentPerformance[];
  alerts: {
    open: Alert[];
    by_severity: { critical: number; warning: number; info: number };
  };
}

interface SuperAdminDashboardProps {
  adminKey: string;
  onAgentSelect?: (agentId: string) => void;
}

type ViewMode = 'platform' | 'clients' | 'agents' | 'alerts';

export function SuperAdminDashboard({ adminKey, onAgentSelect }: SuperAdminDashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(7);
  const [viewMode, setViewMode] = useState<ViewMode>('platform');
  const [selectedClient, setSelectedClient] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const url = selectedClient
        ? `/api/admin/performance?days=${days}&client_id=${selectedClient}`
        : `/api/admin/performance?days=${days}`;
      
      const res = await fetch(url, {
        headers: { 'x-admin-key': adminKey },
      });
      
      if (!res.ok) {
        if (res.status === 401) throw new Error('Unauthorized - check admin key');
        throw new Error('Failed to fetch');
      }
      
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [days, selectedClient]);

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

  const getHealthIcon = (health: string, size = 5) => {
    const className = `w-${size} h-${size}`;
    switch (health) {
      case 'healthy': return <CheckCircle className={`${className} text-green-400`} />;
      case 'needs_attention': return <AlertTriangle className={`${className} text-yellow-400`} />;
      case 'critical': return <XCircle className={`${className} text-red-400`} />;
      default: return <Minus className={`${className} text-gray-400`} />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'warning': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default: return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      await fetch('/api/admin/alerts', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
        },
        body: JSON.stringify({ alertId, status: 'resolved' }),
      });
      fetchData();
    } catch (err) {
      console.error('Failed to resolve alert:', err);
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
        <button onClick={fetchData} className="mt-4 px-4 py-2 bg-purple-600 rounded-lg">
          Retry
        </button>
      </div>
    );
  }

  const { platform, clients, agents, alerts } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-purple-400" />
            Platform Operations
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Monitoring {platform.total_clients} clients • {platform.total_agents} agents
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Client Filter */}
          <select
            value={selectedClient || ''}
            onChange={(e) => setSelectedClient(e.target.value || null)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
          >
            <option value="">All Clients</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.company_name || c.name}</option>
            ))}
          </select>
          
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

      {/* View Mode Tabs */}
      <div className="flex gap-2 border-b border-slate-700 pb-2">
        {[
          { mode: 'platform' as ViewMode, label: 'Platform', icon: Activity },
          { mode: 'clients' as ViewMode, label: 'Clients', icon: Building2 },
          { mode: 'agents' as ViewMode, label: 'Agents', icon: Bot },
          { mode: 'alerts' as ViewMode, label: `Alerts (${platform.total_open_alerts})`, icon: Bell },
        ].map(({ mode, label, icon: Icon }) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              viewMode === mode
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:bg-slate-800'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Platform Overview */}
      {viewMode === 'platform' && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                <Activity className="w-4 h-4" />
                Avg Score
              </div>
              <div className={`text-3xl font-bold ${platform.platform_avg_score ? getHealthColor(
                platform.platform_avg_score >= 80 ? 'healthy' : 
                platform.platform_avg_score >= 60 ? 'needs_attention' : 'critical'
              ) : 'text-gray-400'}`}>
                {platform.platform_avg_score ? `${platform.platform_avg_score}%` : '—'}
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                <Building2 className="w-4 h-4" />
                Clients
              </div>
              <div className="text-3xl font-bold text-white">{platform.total_clients}</div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                <Bot className="w-4 h-4" />
                Agents
              </div>
              <div className="text-3xl font-bold text-white">
                {platform.active_agents}
                <span className="text-sm text-gray-500 ml-1">/ {platform.total_agents}</span>
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                <Users className="w-4 h-4" />
                Interviews
              </div>
              <div className="text-3xl font-bold text-white">{platform.total_interviews}</div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                <BarChart3 className="w-4 h-4" />
                Evaluations
              </div>
              <div className="text-3xl font-bold text-purple-400">{platform.total_evaluations}</div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                <Bell className="w-4 h-4" />
                Open Alerts
              </div>
              <div className={`text-3xl font-bold ${platform.total_open_alerts > 0 ? 'text-red-400' : 'text-green-400'}`}>
                {platform.total_open_alerts}
              </div>
            </div>
          </div>

          {/* Health Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h3 className="font-semibold text-white mb-4">Agent Health Distribution</h3>
              <div className="space-y-3">
                {[
                  { label: 'Healthy', count: platform.health_breakdown.healthy, color: 'green' },
                  { label: 'Needs Attention', count: platform.health_breakdown.needs_attention, color: 'yellow' },
                  { label: 'Critical', count: platform.health_breakdown.critical, color: 'red' },
                  { label: 'No Data', count: platform.health_breakdown.no_data, color: 'gray' },
                ].map(({ label, count, color }) => (
                  <div key={label} className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full bg-${color}-500`} />
                    <span className="text-gray-300 flex-1">{label}</span>
                    <span className={`font-bold text-${color}-400`}>{count}</span>
                    <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full bg-${color}-500`}
                        style={{ width: `${platform.total_agents > 0 ? (count / platform.total_agents) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h3 className="font-semibold text-white mb-4">Top Issues Platform-Wide</h3>
              {platform.top_issues.length > 0 ? (
                <div className="space-y-3">
                  {platform.top_issues.map(({ type, count }) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-gray-300 capitalize">{type.replace(/_/g, ' ')}</span>
                      <span className="text-yellow-400 font-bold">{count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No issues detected</p>
              )}
            </div>
          </div>

          {/* Critical Agents Quick View */}
          {agents.filter(a => a.health === 'critical').length > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <h3 className="font-semibold text-red-400 mb-4 flex items-center gap-2">
                <XCircle className="w-5 h-5" />
                Critical Agents Requiring Attention
              </h3>
              <div className="grid gap-3">
                {agents.filter(a => a.health === 'critical').slice(0, 5).map(agent => (
                  <div 
                    key={agent.id}
                    onClick={() => onAgentSelect?.(agent.id)}
                    className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3 cursor-pointer hover:bg-slate-800"
                  >
                    <div>
                      <div className="text-white font-medium">{agent.name}</div>
                      <div className="text-sm text-gray-400">
                        {agent.client?.company_name || agent.company_name}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-red-400 font-bold">{agent.avg_score}%</span>
                      <span className="text-gray-500">{agent.open_alerts} alerts</span>
                      <ChevronRight className="w-5 h-5 text-gray-500" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Clients View */}
      {viewMode === 'clients' && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
          <div className="divide-y divide-slate-700">
            {clients.map(client => (
              <div
                key={client.id}
                className="p-4 hover:bg-slate-700/50 cursor-pointer"
                onClick={() => setSelectedClient(client.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {getHealthIcon(client.health)}
                    <div>
                      <div className="font-medium text-white">{client.company_name || client.name}</div>
                      <div className="text-sm text-gray-400">
                        {client.email} • {client.subscription_tier}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <div className="text-gray-500">Agents</div>
                      <div className="text-white font-medium">{client.active_agents}/{client.total_agents}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-500">Evals</div>
                      <div className="text-white font-medium">{client.total_evaluations}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-500">Score</div>
                      <div className={`font-bold ${client.avg_score ? getHealthColor(client.health) : 'text-gray-400'}`}>
                        {client.avg_score ? `${client.avg_score}%` : '—'}
                      </div>
                    </div>
                    {client.open_alerts > 0 && (
                      <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs">
                        {client.open_alerts} alerts
                      </span>
                    )}
                    <ChevronRight className="w-5 h-5 text-gray-500" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Agents View */}
      {viewMode === 'agents' && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
          <div className="divide-y divide-slate-700">
            {agents.map(agent => (
              <div
                key={agent.id}
                onClick={() => onAgentSelect?.(agent.id)}
                className="p-4 hover:bg-slate-700/50 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {getHealthIcon(agent.health)}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{agent.name}</span>
                        <span className={`px-2 py-0.5 text-xs rounded ${
                          agent.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {agent.status}
                        </span>
                      </div>
                      <div className="text-sm text-gray-400">
                        {agent.client?.company_name || agent.company_name} • {agent.evaluated_interviews} evaluated
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    {agent.score_breakdown && (
                      <div className="hidden lg:flex items-center gap-4 text-xs">
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
                    <div className={`text-2xl font-bold ${getHealthColor(agent.health)}`}>
                      {agent.avg_score !== null ? `${agent.avg_score}%` : '—'}
                    </div>
                    {agent.open_alerts > 0 && (
                      <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs">
                        {agent.open_alerts}
                      </span>
                    )}
                    <ChevronRight className="w-5 h-5 text-gray-500" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alerts View */}
      {viewMode === 'alerts' && (
        <div className="space-y-4">
          {/* Alert Summary */}
          <div className="flex gap-4">
            {[
              { label: 'Critical', count: alerts.by_severity.critical, color: 'red' },
              { label: 'Warning', count: alerts.by_severity.warning, color: 'yellow' },
              { label: 'Info', count: alerts.by_severity.info, color: 'blue' },
            ].map(({ label, count, color }) => (
              <div key={label} className={`px-4 py-2 rounded-lg bg-${color}-500/20 border border-${color}-500/30`}>
                <span className={`text-${color}-400 font-medium`}>{count} {label}</span>
              </div>
            ))}
          </div>

          {/* Alerts List */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
            {alerts.open.length > 0 ? (
              <div className="divide-y divide-slate-700">
                {alerts.open.map(alert => (
                  <div key={alert.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-0.5 text-xs rounded border ${getSeverityColor(alert.severity)}`}>
                            {alert.severity}
                          </span>
                          <span className="text-white font-medium">{alert.title}</span>
                        </div>
                        <p className="text-gray-400 text-sm">{alert.description}</p>
                        <div className="text-xs text-gray-500 mt-2">
                          Agent: {alert.agents?.name} • {new Date(alert.created_at).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => onAgentSelect?.(alert.agent_id)}
                          className="px-3 py-1 text-sm bg-slate-700 text-gray-300 rounded hover:bg-slate-600"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => resolveAlert(alert.id)}
                          className="px-3 py-1 text-sm bg-green-600/20 text-green-400 rounded hover:bg-green-600/30"
                        >
                          Resolve
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-400" />
                <p>No open alerts - all systems healthy!</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SuperAdminDashboard;
