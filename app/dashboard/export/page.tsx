// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import {
  ArrowLeft, Download, FileText, Table, Calendar,
  Filter, Loader2, CheckCircle, FileSpreadsheet
} from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Agent {
  id: string;
  name: string;
}

export default function ExportPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  // Export options
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
  const [includeTranscripts, setIncludeTranscripts] = useState(true);
  const [includeAnalysis, setIncludeAnalysis] = useState(true);

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      const { data } = await supabase
        .from('agents')
        .select('id, name')
        .eq('status', 'active');
      if (data) setAgents(data);
    } catch (error) {
      console.error('Failed to load agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportData = async () => {
    setExporting(true);
    setExportSuccess(false);

    try {
      // Build query
      let query: any = supabase
        .from('interviews')
        .select(`
          id,
          status,
          source,
          interviewee_name,
          interviewee_email,
          interviewee_profile,
          ${includeTranscripts ? 'transcript, messages,' : ''}
          summary,
          ${includeAnalysis ? 'extracted_data,' : ''}
          feedback,
          started_at,
          completed_at,
          duration_seconds,
          created_at,
          agents (name, company_name)
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (selectedAgent !== 'all') {
        query = query.eq('agent_id', selectedAgent);
      }
      if (selectedStatus !== 'all') {
        query = query.eq('status', selectedStatus);
      }
      if (dateFrom) {
        query = query.gte('created_at', dateFrom);
      }
      if (dateTo) {
        query = query.lte('created_at', dateTo + 'T23:59:59');
      }

      const { data, error } = await query;

      if (error) throw error;
      if (!data || data.length === 0) {
        alert('No interviews found with the selected filters');
        return;
      }

      if (exportFormat === 'csv') {
        downloadCSV(data);
      } else {
        downloadJSON(data);
      }

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);

    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const downloadCSV = (data: any[]) => {
    // Flatten data for CSV
    const rows = data.map(interview => ({
      id: interview.id,
      agent_name: interview.agents?.name || '',
      company: interview.agents?.company_name || '',
      interviewee_name: interview.interviewee_name || '',
      interviewee_email: interview.interviewee_email || '',
      status: interview.status,
      source: interview.source,
      duration_seconds: interview.duration_seconds || '',
      summary: interview.summary || '',
      transcript: includeTranscripts ? (interview.transcript || formatMessages(interview.messages)).replace(/"/g, '""') : '',
      ai_analysis: includeAnalysis ? (interview.extracted_data?.ai_analysis || '').replace(/"/g, '""') : '',
      started_at: interview.started_at || '',
      completed_at: interview.completed_at || '',
      created_at: interview.created_at,
    }));

    const headers = Object.keys(rows[0]);
    const csvContent = [
      headers.join(','),
      ...rows.map(row => 
        headers.map(h => `"${row[h as keyof typeof row] || ''}"`).join(',')
      ),
    ].join('\n');

    downloadFile(csvContent, 'interviews-export.csv', 'text/csv');
  };

  const downloadJSON = (data: any[]) => {
    const jsonContent = JSON.stringify(data, null, 2);
    downloadFile(jsonContent, 'interviews-export.json', 'application/json');
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatMessages = (messages: any[]): string => {
    if (!messages || messages.length === 0) return '';
    return messages
      .map(m => `${m.role}: ${m.content}`)
      .join(' | ');
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
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="p-2 hover:bg-slate-800 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold">Export Data</h1>
              <p className="text-sm text-slate-400">Download interview data</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          {/* Filters */}
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Filter className="w-4 h-4 text-purple-400" />
                Filters
              </h3>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Agent</label>
                  <select
                    value={selectedAgent}
                    onChange={(e) => setSelectedAgent(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
                  >
                    <option value="all">All Agents</option>
                    {agents.map(agent => (
                      <option key={agent.id} value={agent.id}>{agent.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">Status</label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
                  >
                    <option value="all">All Status</option>
                    <option value="completed">Completed</option>
                    <option value="in_progress">In Progress</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">From Date</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">To Date</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
                  />
                </div>
              </div>
            </div>

            {/* Format Selection */}
            <div>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                Export Format
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setExportFormat('csv')}
                  className={`p-4 rounded-xl border-2 text-center transition ${
                    exportFormat === 'csv'
                      ? 'border-green-500 bg-green-500/10'
                      : 'border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 text-green-400" />
                  <div className="font-medium">CSV</div>
                  <div className="text-xs text-slate-400">Excel compatible</div>
                </button>

                <button
                  onClick={() => setExportFormat('json')}
                  className={`p-4 rounded-xl border-2 text-center transition ${
                    exportFormat === 'json'
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <FileText className="w-8 h-8 mx-auto mb-2 text-blue-400" />
                  <div className="font-medium">JSON</div>
                  <div className="text-xs text-slate-400">Full data structure</div>
                </button>
              </div>
            </div>

            {/* Options */}
            <div>
              <h3 className="font-semibold mb-4">Include</h3>

              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeTranscripts}
                    onChange={(e) => setIncludeTranscripts(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-purple-500 focus:ring-purple-500"
                  />
                  <span>Full transcripts</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeAnalysis}
                    onChange={(e) => setIncludeAnalysis(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-purple-500 focus:ring-purple-500"
                  />
                  <span>AI analysis (if available)</span>
                </label>
              </div>
            </div>

            {/* Export Button */}
            <button
              onClick={exportData}
              disabled={exporting}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-lg font-medium transition"
            >
              {exporting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Exporting...
                </>
              ) : exportSuccess ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Downloaded!
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Export {exportFormat.toUpperCase()}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-slate-800/50 rounded-xl text-sm text-slate-400">
          <p className="mb-2">
            <strong className="text-white">Note:</strong> Large exports may take a moment to process.
          </p>
          <p>
            CSV exports are compatible with Excel, Google Sheets, and other spreadsheet applications.
            JSON exports include the full data structure for programmatic use.
          </p>
        </div>
      </main>
    </div>
  );
}
