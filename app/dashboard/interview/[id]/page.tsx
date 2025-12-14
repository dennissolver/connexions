'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import {
  ArrowLeft, User, Clock, Calendar, MessageSquare, Phone,
  FileText, Download, Brain, Play, CheckCircle, Loader2,
  Copy, ChevronDown, ChevronUp
} from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Message {
  role: 'agent' | 'user';
  content: string;
  timestamp?: string;
}

interface Interview {
  id: string;
  agent_id: string;
  status: string;
  source: string;
  interviewee_name: string | null;
  interviewee_email: string | null;
  interviewee_profile: Record<string, any>;
  conversation_id: string | null;
  messages: Message[];
  transcript: string | null;
  transcript_url: string | null;
  summary: string | null;
  feedback: Record<string, any>;
  extracted_data: Record<string, any>;
  started_at: string | null;
  completed_at: string | null;
  duration_seconds: number | null;
  created_at: string;
  agents?: {
    id: string;
    name: string;
    company_name: string;
    interview_purpose: string;
  };
}

export default function InterviewDetailPage() {
  const params = useParams();
  const interviewId = params.id as string;
  
  const [interview, setInterview] = useState<Interview | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [showRawData, setShowRawData] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadInterview();
  }, [interviewId]);

  const loadInterview = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('interviews')
        .select(`
          *,
          agents (id, name, company_name, interview_purpose)
        `)
        .eq('id', interviewId)
        .single();

      if (error) throw error;
      setInterview(data);
      
      // Load existing analysis if available
      if (data.extracted_data?.ai_analysis) {
        setAnalysis(data.extracted_data.ai_analysis);
      }
    } catch (error) {
      console.error('Failed to load interview:', error);
    } finally {
      setLoading(false);
    }
  };

  const runAnalysis = async () => {
    if (!interview) return;
    
    setAnalyzing(true);
    try {
      const response = await fetch('/api/analyze-interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interviewId: interview.id,
          transcript: interview.transcript || formatMessagesAsTranscript(interview.messages),
          agentPurpose: interview.agents?.interview_purpose,
        }),
      });

      if (!response.ok) throw new Error('Analysis failed');

      const result = await response.json();
      setAnalysis(result.analysis);
      
      // Refresh interview to get updated extracted_data
      loadInterview();
    } catch (error) {
      console.error('Analysis failed:', error);
      alert('Failed to analyze interview. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const formatMessagesAsTranscript = (messages: Message[]): string => {
    if (!messages || messages.length === 0) return '';
    return messages
      .map(m => `${m.role === 'agent' ? 'Agent' : 'Interviewee'}: ${m.content}`)
      .join('\n\n');
  };

  const copyTranscript = async () => {
    const text = interview?.transcript || formatMessagesAsTranscript(interview?.messages || []);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadTranscript = () => {
    if (!interview) return;
    
    const text = interview.transcript || formatMessagesAsTranscript(interview.messages || []);
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interview-${interview.id.slice(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('en-AU', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  if (!interview) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Interview Not Found</h2>
          <Link href="/dashboard" className="text-purple-400 hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const messages = interview.messages || [];
  const transcriptText = interview.transcript || formatMessagesAsTranscript(messages);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="p-2 hover:bg-slate-800 rounded-lg transition"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold">Interview Details</h1>
                <p className="text-sm text-slate-400">
                  {interview.agents?.name || 'Unknown Agent'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={copyTranscript}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition"
              >
                <Copy className="w-4 h-4" />
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button
                onClick={downloadTranscript}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
              <button
                onClick={runAnalysis}
                disabled={analyzing}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-lg transition"
              >
                {analyzing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Brain className="w-4 h-4" />
                )}
                {analyzing ? 'Analyzing...' : 'AI Analysis'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Metadata */}
          <div className="space-y-6">
            {/* Interviewee Info */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <User className="w-4 h-4 text-purple-400" />
                Interviewee
              </h3>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-slate-400">Name</div>
                  <div>{interview.interviewee_name || 'Anonymous'}</div>
                </div>
                {interview.interviewee_email && (
                  <div>
                    <div className="text-sm text-slate-400">Email</div>
                    <div>{interview.interviewee_email}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Interview Stats */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-400" />
                Details
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">Status</span>
                  <span className={`capitalize ${
                    interview.status === 'completed' ? 'text-green-400' :
                    interview.status === 'in_progress' ? 'text-blue-400' :
                    'text-slate-400'
                  }`}>
                    {interview.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Source</span>
                  <span className="capitalize">{interview.source}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Duration</span>
                  <span>{formatDuration(interview.duration_seconds)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Messages</span>
                  <span>{messages.length}</span>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-orange-400" />
                Timeline
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-slate-400">Created</div>
                  <div>{formatDate(interview.created_at)}</div>
                </div>
                {interview.started_at && (
                  <div>
                    <div className="text-slate-400">Started</div>
                    <div>{formatDate(interview.started_at)}</div>
                  </div>
                )}
                {interview.completed_at && (
                  <div>
                    <div className="text-slate-400">Completed</div>
                    <div>{formatDate(interview.completed_at)}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Summary */}
            {interview.summary && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-green-400" />
                  Summary
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {interview.summary}
                </p>
              </div>
            )}
          </div>

          {/* Right Column - Transcript & Analysis */}
          <div className="lg:col-span-2 space-y-6">
            {/* AI Analysis */}
            {analysis && (
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Brain className="w-4 h-4 text-purple-400" />
                  AI Analysis
                </h3>
                <div className="prose prose-invert prose-sm max-w-none">
                  <div className="whitespace-pre-wrap text-slate-300 leading-relaxed">
                    {analysis}
                  </div>
                </div>
              </div>
            )}

            {/* Transcript */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                <h3 className="font-semibold flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-400" />
                  Conversation Transcript
                </h3>
              </div>
              
              <div className="p-4 max-h-[600px] overflow-y-auto">
                {messages.length > 0 ? (
                  <div className="space-y-4">
                    {messages.map((message, idx) => (
                      <div
                        key={idx}
                        className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          message.role === 'agent' 
                            ? 'bg-purple-500/20' 
                            : 'bg-blue-500/20'
                        }`}>
                          {message.role === 'agent' ? (
                            <Phone className="w-4 h-4 text-purple-400" />
                          ) : (
                            <User className="w-4 h-4 text-blue-400" />
                          )}
                        </div>
                        <div className={`flex-1 ${message.role === 'user' ? 'text-right' : ''}`}>
                          <div className="text-xs text-slate-500 mb-1">
                            {message.role === 'agent' ? 'Agent' : 'Interviewee'}
                          </div>
                          <div className={`inline-block p-3 rounded-xl max-w-[80%] text-sm ${
                            message.role === 'agent'
                              ? 'bg-slate-800 text-slate-200'
                              : 'bg-blue-600 text-white'
                          }`}>
                            {message.content}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : transcriptText ? (
                  <pre className="whitespace-pre-wrap text-sm text-slate-300 leading-relaxed">
                    {transcriptText}
                  </pre>
                ) : (
                  <p className="text-slate-500 text-center py-8">
                    No transcript available
                  </p>
                )}
              </div>
            </div>

            {/* Raw Data (collapsible) */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <button
                onClick={() => setShowRawData(!showRawData)}
                className="w-full p-4 flex justify-between items-center hover:bg-slate-800/50 transition"
              >
                <h3 className="font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-400" />
                  Raw Data
                </h3>
                {showRawData ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
              
              {showRawData && (
                <div className="p-4 border-t border-slate-800">
                  <pre className="text-xs text-slate-400 overflow-x-auto">
                    {JSON.stringify({
                      interviewee_profile: interview.interviewee_profile,
                      extracted_data: interview.extracted_data,
                      feedback: interview.feedback,
                    }, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
