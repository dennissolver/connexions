// components/dashboard/AgentDrilldown.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Clock,
  Target,
  MessageSquare,
  Users,
  FileText,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';

interface AgentDetail {
  id: string;
  name: string;
  slug: string;
  company_name: string;
  interview_purpose: string;
  target_interviewees: string;
  interviewer_tone: string;
  total_interviews: number;
  completed_interviews: number;
  status: string;
}

interface Summary {
  evaluated_interviews: number;
  avg_scores: {
    overall: number;
    goal_achievement: number;
    conversation_quality: number;
    user_engagement: number;
    prompt_adherence: number;
  } | null;
  score_distribution: {
    excellent: number;
    good: number;
    needs_improvement: number;
    poor: number;
  };
  health: string;
}

interface Issue {
  type: string;
  count: number;
  percentage: number;
  examples: Array<{
    message: string;
    severity: string;
    interview_id: string;
  }>;
}

interface Recommendation {
  type: string;
  priority: string;
  suggestion: string;
  expected_impact: string;
  frequency: number;
}

interface Alert {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  description: string;
  created_at: string;
  status: string;
}

interface RecentEval {
  id: string;
  interview_id: string;
  overall_score: number;
  summary: string;
  issues_count: number;
  created_at: string;
}

interface DrilldownData {
  agent: AgentDetail;
  period: { days: number };
  summary: Summary;
  trends: {
    daily_scores: Array<{ date: string; avg_score: number; count: number }>;
  };
  issues: {
    top_issues: Issue[];
    total_issues: number;
  };
  recommendations: Recommendation[];
  alerts: {
    open: Alert[];
    count: number;
  };
  recent_evaluations: RecentEval[];
}

interface AgentDrilldownProps {
  agentId: string;
  onBack?: () => void;
}

export function AgentDrilldown({ agentId, onBack }: AgentDrilldownProps) {
  const [data, setData] = useState<DrilldownData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    issues: true,
    recommendations: true,
    evaluations: false,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/agents/${agentId}?days=${days}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError('Failed to load agent details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [agentId, days]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const resolveAlert = async (alertId: string) => {
    try {
      await fetch('/api/dashboard/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId, status: 'resolved' }),
      });
      fetchData();
    } catch (err) {
      console.error('Failed to resolve alert:', err);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-400 bg-red-500/20';
      case 'warning': return 'text-yellow-400 bg-yellow-500/20';
      default: return 'text-blue-400 bg-blue-500/20';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      default: return 'text-gray-400';
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

  const { agent, summary, trends, issues, recommendations, alerts, recent_evaluations } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-white">{agent.name}</h1>
            <p className="text-gray-400 text-sm">{agent.company_name}</p>
          </div>
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
          <button onClick={fetchData} className="p-2 bg-slate-800 border border-slate-700 rounded-lg">
            <RefreshCw className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Score Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* Overall Score */}
        <div className="md:col-span-2 bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <div className="text-gray-400 text-sm mb-2">Overall Score</div>
          <div className={`text-5xl font-bold ${summary.avg_scores ? getScoreColor(summary.avg_scores.overall) : 'text-gray-400'}`}>
            {summary.avg_scores ? `${summary.avg_scores.overall}%` : '—'}
          </div>
          <div className="mt-4 text-sm text-gray-400">
            {summary.evaluated_interviews} interviews evaluated
          </div>
          
          {/* Score Distribution */}
          <div className="mt-4 flex gap-1">
            {summary.score_distribution.excellent > 0 && (
              <div
                className="h-2 bg-green-500 rounded"
                style={{ flex: summary.score_distribution.excellent }}
                title={`${summary.score_distribution.excellent} excellent`}
              />
            )}
            {summary.score_distribution.good > 0 && (
              <div
                className="h-2 bg-blue-500 rounded"
                style={{ flex: summary.score_distribution.good }}
                title={`${summary.score_distribution.good} good`}
              />
            )}
            {summary.score_distribution.needs_improvement > 0 && (
              <div
                className="h-2 bg-yellow-500 rounded"
                style={{ flex: summary.score_distribution.needs_improvement }}
                title={`${summary.score_distribution.needs_improvement} needs improvement`}
              />
            )}
            {summary.score_distribution.poor > 0 && (
              <div
                className="h-2 bg-red-500 rounded"
                style={{ flex: summary.score_distribution.poor }}
                title={`${summary.score_distribution.poor} poor`}
              />
            )}
          </div>
          <div className="mt-2 flex justify-between text-xs text-gray-500">
            <span>Excellent: {summary.score_distribution.excellent}</span>
            <span>Good: {summary.score_distribution.good}</span>
            <span>Needs work: {summary.score_distribution.needs_improvement}</span>
            <span>Poor: {summary.score_distribution.poor}</span>
          </div>
        </div>

        {/* Category Scores */}
        <div className="md:col-span-3 bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <div className="text-gray-400 text-sm mb-4">Score Breakdown</div>
          {summary.avg_scores ? (
            <div className="space-y-4">
              {[
                { label: 'Goal Achievement', score: summary.avg_scores.goal_achievement, icon: Target },
                { label: 'Conversation Quality', score: summary.avg_scores.conversation_quality, icon: MessageSquare },
                { label: 'User Engagement', score: summary.avg_scores.user_engagement, icon: Users },
                { label: 'Prompt Adherence', score: summary.avg_scores.prompt_adherence, icon: FileText },
              ].map(({ label, score, icon: Icon }) => (
                <div key={label} className="flex items-center gap-4">
                  <Icon className="w-5 h-5 text-gray-500" />
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-300">{label}</span>
                      <span className={getScoreColor(score)}>{score}%</span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div className={`h-full ${getScoreBg(score)}`} style={{ width: `${score}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 text-center py-8">No evaluation data</div>
          )}
        </div>
      </div>

      {/* Open Alerts */}
      {alerts.count > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <span className="font-semibold text-red-400">{alerts.count} Open Alert{alerts.count > 1 ? 's' : ''}</span>
            </div>
          </div>
          <div className="space-y-3">
            {alerts.open.map((alert) => (
              <div key={alert.id} className="bg-slate-800/50 rounded-lg p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-xs rounded ${getSeverityColor(alert.severity)}`}>
                        {alert.severity}
                      </span>
                      <span className="text-white font-medium">{alert.title}</span>
                    </div>
                    <p className="text-gray-400 text-sm mt-1">{alert.description}</p>
                  </div>
                  <button
                    onClick={() => resolveAlert(alert.id)}
                    className="px-3 py-1 text-sm bg-green-600/20 text-green-400 rounded hover:bg-green-600/30"
                  >
                    Resolve
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Score Trend Chart */}
      {trends.daily_scores.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <div className="text-gray-400 text-sm mb-4">Score Trend</div>
          <div className="h-40 flex items-end gap-1">
            {trends.daily_scores.map((day, i) => (
              <div key={day.date} className="flex-1 flex flex-col items-center group relative">
                <div
                  className={`w-full rounded-t ${getScoreBg(day.avg_score)} transition-all hover:opacity-80`}
                  style={{ height: `${day.avg_score}%` }}
                />
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-700 px-2 py-1 rounded text-xs text-white opacity-0 group-hover:opacity-100 whitespace-nowrap">
                  {day.date}: {day.avg_score}% ({day.count})
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>{trends.daily_scores[0]?.date}</span>
            <span>{trends.daily_scores[trends.daily_scores.length - 1]?.date}</span>
          </div>
        </div>
      )}

      {/* Top Issues */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
        <button
          onClick={() => toggleSection('issues')}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-700/50"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            <span className="font-semibold text-white">Top Issues ({issues.total_issues} total)</span>
          </div>
          {expandedSections.issues ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </button>
        {expandedSections.issues && (
          <div className="px-4 pb-4 space-y-3">
            {issues.top_issues.length > 0 ? issues.top_issues.map((issue) => (
              <div key={issue.type} className="bg-slate-700/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-white capitalize">{issue.type.replace(/_/g, ' ')}</span>
                  <span className="text-yellow-400">{issue.count}x ({issue.percentage}%)</span>
                </div>
                <div className="space-y-2">
                  {issue.examples.map((ex, i) => (
                    <div key={i} className="text-sm text-gray-400 pl-4 border-l-2 border-slate-600">
                      {ex.message}
                    </div>
                  ))}
                </div>
              </div>
            )) : (
              <div className="text-gray-500 text-center py-4">No issues detected</div>
            )}
          </div>
        )}
      </div>

      {/* Recommendations */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
        <button
          onClick={() => toggleSection('recommendations')}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-700/50"
        >
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-400" />
            <span className="font-semibold text-white">Recommendations ({recommendations.length})</span>
          </div>
          {expandedSections.recommendations ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </button>
        {expandedSections.recommendations && (
          <div className="px-4 pb-4 space-y-3">
            {recommendations.length > 0 ? recommendations.map((rec, i) => (
              <div key={i} className="bg-slate-700/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-medium ${getPriorityColor(rec.priority)}`}>
                    {rec.priority.toUpperCase()}
                  </span>
                  <span className="text-xs text-gray-500 capitalize">{rec.type.replace(/_/g, ' ')}</span>
                  <span className="text-xs text-gray-600">• Suggested {rec.frequency}x</span>
                </div>
                <p className="text-white">{rec.suggestion}</p>
                <p className="text-sm text-gray-400 mt-2">Expected impact: {rec.expected_impact}</p>
              </div>
            )) : (
              <div className="text-gray-500 text-center py-4">No recommendations</div>
            )}
          </div>
        )}
      </div>

      {/* Recent Evaluations */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
        <button
          onClick={() => toggleSection('evaluations')}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-700/50"
        >
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            <span className="font-semibold text-white">Recent Evaluations</span>
          </div>
          {expandedSections.evaluations ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </button>
        {expandedSections.evaluations && (
          <div className="divide-y divide-slate-700">
            {recent_evaluations.map((evalItem) => (
              <div key={evalItem.id} className="px-4 py-3 hover:bg-slate-700/30">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${getScoreColor(evalItem.overall_score)}`}>
                        {evalItem.overall_score}%
                      </span>
                      {evalItem.issues_count > 0 && (
                        <span className="text-xs text-yellow-400">
                          {evalItem.issues_count} issue{evalItem.issues_count > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400 mt-1 line-clamp-2">{evalItem.summary}</p>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(evalItem.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AgentDrilldown;
