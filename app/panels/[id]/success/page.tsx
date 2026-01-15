// app/panels/[id]/success/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  CheckCircle, Copy, ExternalLink, Share2, Mail,
  Loader2, Sparkles, ArrowRight, MessageSquare, Link2
} from 'lucide-react';

interface Panel {
  id: string;
  name: string;
  slug: string;
  description: string;
  elevenlabs_agent_id: string;
  settings: {
    duration_minutes?: number;
    target_audience?: string;
  };
}

export default function PanelSuccessPage() {
  const params = useParams();
  const router = useRouter();
  const panelId = params.id as string;

  const [panel, setPanel] = useState<Panel | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const interviewUrl = `${baseUrl}/i/${panelId}`;
  const dashboardUrl = `/dashboard`;

  useEffect(() => {
    fetchPanel();
  }, [panelId]);

  const fetchPanel = async () => {
    try {
      const res = await fetch(`/api/panels/${panelId}`);
      if (res.ok) {
        const data = await res.json();
        setPanel(data);
      }
    } catch (err) {
      console.error('Failed to fetch panel:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent(`Interview Invitation: ${panel?.name || 'Interview Panel'}`);
    const body = encodeURIComponent(
      `Hi,\n\nYou're invited to participate in an interview.\n\nClick here to start: ${interviewUrl}\n\nThis should take about ${panel?.settings?.duration_minutes || 15} minutes.\n\nThank you!`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      {/* Header */}
      <div className="bg-white/70 backdrop-blur-sm border-b border-emerald-100">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-200">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900">Panel Created!</h1>
              <p className="text-sm text-gray-500">Your AI interviewer is ready</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-6 py-12">
        {/* Success Hero */}
        <div className="text-center mb-12">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-400 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-emerald-200">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            🎉 {panel?.name || 'Your Panel'} is Live!
          </h2>
          <p className="text-lg text-gray-500 max-w-md mx-auto">
            Your AI interviewer is ready to conduct interviews. Share the link below to get started.
          </p>
        </div>

        {/* Interview Link Card */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-100/50 p-8 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Link2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Interview Link</h3>
              <p className="text-sm text-gray-500">Share this with your participants</p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-2xl p-4 flex items-center gap-3 mb-4">
            <code className="flex-1 text-sm text-gray-700 truncate font-mono">
              {interviewUrl}
            </code>
            <button
              onClick={() => copyToClipboard(interviewUrl, 'link')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition ${
                copied === 'link'
                  ? 'bg-emerald-100 text-emerald-600'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {copied === 'link' ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy
                </>
              )}
            </button>
          </div>

          {/* Share Options */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => window.open(interviewUrl, '_blank')}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition"
            >
              <ExternalLink className="w-4 h-4" />
              Test Interview
            </button>
            <button
              onClick={shareViaEmail}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition"
            >
              <Mail className="w-4 h-4" />
              Share via Email
            </button>
            <button
              onClick={() => copyToClipboard(
                `You're invited to participate in an interview: ${panel?.name}\n\nClick here to start: ${interviewUrl}`,
                'message'
              )}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition ${
                copied === 'message'
                  ? 'bg-emerald-100 text-emerald-600'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Share2 className="w-4 h-4" />
              {copied === 'message' ? 'Copied!' : 'Copy Message'}
            </button>
          </div>
        </div>

        {/* Panel Summary */}
        {panel && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 mb-8">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-violet-400" />
              Panel Summary
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Name</span>
                <p className="font-medium text-gray-900">{panel.name}</p>
              </div>
              {panel.description && (
                <div className="col-span-2">
                  <span className="text-gray-500">Description</span>
                  <p className="font-medium text-gray-900">{panel.description}</p>
                </div>
              )}
              {panel.settings?.duration_minutes && (
                <div>
                  <span className="text-gray-500">Duration</span>
                  <p className="font-medium text-gray-900">{panel.settings.duration_minutes} minutes</p>
                </div>
              )}
              {panel.settings?.target_audience && (
                <div>
                  <span className="text-gray-500">Audience</span>
                  <p className="font-medium text-gray-900">{panel.settings.target_audience}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Next Steps */}
        <div className="bg-gradient-to-br from-violet-50 to-fuchsia-50 rounded-3xl border border-violet-100 p-8">
          <h3 className="font-semibold t