'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Phone, Clock, CheckCircle, XCircle, Play, FileText,
  Download, Brain, Filter, Search, RefreshCw, BarChart3,
  MessageSquare, User, Calendar, ChevronRight, Loader2
} from 'lucide-react';
import Link from 'next/link';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Interview {
  id: string;
  agent_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'abandoned';
  source: string;
  interviewee_name: string | null;
  interviewee_email: string | null;
  conversation_id: string | null;
  summary: string | null;
  duration_seconds: number | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  agents?: {
    name: string;
    company_name: string;
  };
}

interface Agent {
  id: string;
  name: string;
  total_interviews: number;
  completed_interviews: number;
}

export default function DashboardPage() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
    avgDuration: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load agents
      const { data: agentsData } = await supabase
        .from('agents')
        .select('id, name, total_interviews, completed_interviews')
        .eq('status', 'active');

      if (agentsData) setAgents(agentsData);

      // Load interviews with agent info
      const { data: interviewsData } = await supabase
        .from('interviews')
        .select(`
          *,
          agents (name, company_name)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (interviewsData) {
        setInterviews(interviewsData);
        
        // Calculate stats
        const completed = interviewsData.filter(i => i.status === 'completed');
        const inProgress = interviewsData.filter(i => i.status === 'in_progress');
        const durations = completed
          .filter(i => i.duration_seconds)
          .map(i => i.duration_seconds!);
        
        setStats({
          total: interviewsData.length,
          completed: completed.length,
          inProgress: inProgress.length,
          avgDuration: durations.length > 0 
            ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
            : 0,
        });
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredInterviews = interviews.filter(interview => {
    if (selectedAgent !== 'all' && interview.agent_id !== selectedAgent) return false;
    if (selectedStatus !== 'all' && interview.status !== selectedStatus) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        interview.interviewee_name?.toLowerCase().includes(query) ||
        interview.interviewee_email?.toLowerCase().includes(query) ||
        interview.summary?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-slate-500/20 text-slate-400',
      in_progress: 'bg-blue-500/20 text-blue-400',
      completed: 'bg-green-500/20 text-green-400',
      failed: 'bg-red-500/20 text-red-400',
      abandoned: 'bg-orange-500/20 text-orange-400',
    };
    const icons: Record<string, React.ReactNode> = {
      pending: <Clock className="w-3 h-3" />,
      in_progress: <Play className="w-3 h-3" />,
      completed: <CheckCircle className="w-3 h-3" />,
      failed: <XCircle className="w-3 h-3" />,
      abandoned: <XCircle className="w-3 h-3" />,
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {icons[status]}
        {status.replace('_', ' ')}
      </span>
    );
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">Interview Dashboard</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={loadData}
              className="p-2 hover:bg-slate-800 rounded-lg transition"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <Link
              href="/dashboard/export"
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg transition"
            >
              <Download className="w-4 h-4" />
              Export
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-sm text-slate-400">Total Interviews</div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.completed}</div>
                <div className="text-sm text-slate-400">Completed</div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Play className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.inProgress}</div>
                <div className="text-sm text-slate-400">In Progress</div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">{formatDuration(stats.avgDuration)}</div>
                <div className="text-sm text-slate-400">Avg Duration</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search interviews..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-slate-500 focus:border-purple-500 outline-none"
              />
            </div>
          </div>

          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-purple-500 outline-none"
          >
            <option value="all">All Agents</option>
            {agents.map(agent => (
              <option key={agent.id} value={agent.id}>{agent.name}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-purple-500 outline-none"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="in_progress">In Progress</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="abandoned">Abandoned</option>
          </select>
        </div>

        {/* Interviews List */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">Interviewee</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">Agent</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">Status</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">Duration</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">Date</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInterviews.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-500">
                      No interviews found
                    </td>
                  </tr>
                ) : (
                  filteredInterviews.map((interview) => (
                    <tr key={interview.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-slate-400" />
                          </div>
                          <div>
                            <div className="font-medium">
                              {interview.interviewee_name || 'Anonymous'}
                            </div>
                            {interview.interviewee_email && (
                              <div className="text-xs text-slate-500">{interview.interviewee_email}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm">{interview.agents?.name || '-'}</div>
                      </td>
                      <td className="px-4 py-4">
                        {getStatusBadge(interview.status)}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-400">
                        {formatDuration(interview.duration_seconds)}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-400">
                        {formatDate(interview.created_at)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/dashboard/interview/${interview.id}`}
                            className="p-2 hover:bg-slate-700 rounded-lg transition"
                            title="View Details"
                          >
                            <FileText className="w-4 h-4" />
                          </Link>
                          {interview.status === 'completed' && (
                            <Link
                              href={`/dashboard/interview/${interview.id}/analyze`}
                              className="p-2 hover:bg-slate-700 rounded-lg transition"
                              title="AI Analysis"
                            >
                              <Brain className="w-4 h-4" />
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
