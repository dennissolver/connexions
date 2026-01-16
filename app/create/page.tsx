// app/create/page.tsx
'use client';

import { useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Phone,
  PhoneOff,
  Loader2,
  Mic,
  MicOff,
  MessageSquare,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  FileEdit
} from 'lucide-react';

type CallStatus = 'idle' | 'connecting' | 'connected' | 'finding-draft' | 'draft-ready' | 'error';

function CreateAgentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userName = searchParams.get('name') || '';

  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [conversation, setConversation] = useState<any>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pollAttempts, setPollAttempts] = useState(0);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState<string | null>(null);

  const MAX_POLL_ATTEMPTS = 20;
  const POLL_INTERVAL = 1500;

  // Poll for the latest draft, then show button instead of redirecting
  const pollForDraft = useCallback(
    async (attempt: number = 0) => {
      if (attempt >= MAX_POLL_ATTEMPTS) {
        setError(
          'Could not find your panel draft. Sandra may not have saved it yet. Please try again.'
        );
        setCallStatus('error');
        return;
      }

      setPollAttempts(attempt + 1);

      try {
        const res = await fetch('/api/panels/drafts/latest');

        if (res.ok) {
          const draft = await res.json();
          if (draft.found && draft.id) {
            setDraftId(draft.id);
            setDraftName(draft.name || 'Your Panel');
            setCallStatus('draft-ready');
            return;
          }
        }

        setTimeout(() => pollForDraft(attempt + 1), POLL_INTERVAL);
      } catch (err) {
        console.error('[poll] Error:', err);
        setTimeout(() => pollForDraft(attempt + 1), POLL_INTERVAL);
      }
    },
    []
  );

  const handleCallEnd = useCallback(() => {
    setCallStatus('finding-draft');
    pollForDraft(0);
  }, [pollForDraft]);

  const startCall = async () => {
    setCallStatus('connecting');
    setError(null);
    setTranscript([]);
    setPollAttempts(0);
    setDraftId(null);
    setDraftName(null);

    try {
      const response = await fetch('/api/setup-agent/voice/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start call');
      }

      const { Conversation } = await import('@elevenlabs/client');

      const dynamicVariables: Record<string, string> = {};
      if (userName) {
        dynamicVariables.user_name = userName;
        dynamicVariables.first_name = userName.split(' ')[0];
      }

      const conv = await Conversation.startSession({
        signedUrl: data.signedUrl,
        dynamicVariables:
          Object.keys(dynamicVariables).length > 0 ? dynamicVariables : undefined,
        onConnect: ({ conversationId: convId }: { conversationId?: string }) => {
          console.log('[call] Connected, conversation ID:', convId);
          setConversationId(convId || null);
          setCallStatus('connected');
        },
        onDisconnect: () => {
          console.log('[call] Disconnected');
          handleCallEnd();
        },
        onMessage: (message: any) => {
          if (message.message) {
            setTranscript((prev) => [...prev, `${message.source}: ${message.message}`]);
          }
        },
        onError: (err: any) => {
          console.error('[call] Error:', err);
          setError(err.message || 'Call error occurred');
          setCallStatus('error');
        },
      });

      setConversation(conv);
    } catch (err: any) {
      console.error('[call] Failed to start:', err);
      setError(err.message || 'Failed to start call');
      setCallStatus('error');
    }
  };

  const endCall = async () => {
    if (conversation) {
      try {
        await conversation.endSession();
      } catch (err) {
        console.error('[call] Error ending session:', err);
      }
      setConversation(null);
    }
    handleCallEnd();
  };

  const toggleMute = () => {
    if (conversation) {
      if (isMuted) {
        conversation.unmute();
      } else {
        conversation.mute();
      }
      setIsMuted(!isMuted);
    }
  };

  const retry = () => {
    setCallStatus('idle');
    setError(null);
    setConversationId(null);
    setPollAttempts(0);
    setTranscript([]);
    setDraftId(null);
    setDraftName(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-amber-50">
      <div className="bg-white/70 backdrop-blur-sm border-b border-violet-100">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-200">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900">Talk to Sandra</h1>
            <p className="text-sm text-gray-500">Design your interview panel</p>
          </div>
        </div>
      </div>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="text-center max-w-lg">
          {callStatus === 'idle' && (
            <>
              <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-violet-400 to-fuchsia-400 flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-violet-300">
                <Phone className="w-14 h-14 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                {userName ? `Hi ${userName.split(' ')[0]}! 👋` : 'Ready to design your panel'}
              </h2>
              <p className="text-gray-500 mb-8 text-lg">
                {userName
                  ? "I'm Sandra, your AI assistant. Let's create your first interview panel together!"
                  : "Start a voice conversation with Sandra. Just tell her what you need — she'll design a custom AI interviewer for you."}
              </p>
              <button
                onClick={startCall}
                className="inline-flex items-center gap-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-10 py-5 rounded-2xl font-semibold text-xl shadow-xl shadow-emerald-200 hover:shadow-2xl hover:shadow-emerald-300 transition-all hover:scale-105"
              >
                <Phone className="w-6 h-6" />
                Start Call with Sandra
              </button>
              <p className="text-sm text-gray-400 mt-6">✨ Takes about 3-5 minutes</p>
            </>
          )}

          {callStatus === 'connecting' && (
            <>
              <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-violet-400 to-fuchsia-400 flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-violet-300">
                <Loader2 className="w-14 h-14 text-white animate-spin" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Connecting to Sandra...</h2>
              <p className="text-gray-500">Setting up your voice session</p>
            </>
          )}

          {callStatus === 'connected' && (
            <>
              <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-400 flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-emerald-300 animate-pulse">
                <Mic className="w-14 h-14 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-emerald-600 mb-4">Connected with Sandra</h2>
              <p className="text-gray-500 mb-8">Speak naturally — Sandra is listening 🎙️</p>

              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={toggleMute}
                  className={`p-5 rounded-2xl transition-all shadow-lg ${
                    isMuted
                      ? 'bg-amber-100 text-amber-600 shadow-amber-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {isMuted ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
                </button>
                <button
                  onClick={endCall}
                  className="p-5 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-2xl shadow-lg shadow-red-200 hover:shadow-xl transition-all"
                >
                  <PhoneOff className="w-7 h-7" />
                </button>
              </div>

              {transcript.length > 0 && (
                <div className="mt-10 text-left bg-white rounded-2xl p-5 max-h-48 overflow-y-auto border border-gray-100 shadow-sm">
                  <p className="text-xs text-gray-400 mb-3 font-medium">Live transcript</p>
                  {transcript.slice(-5).map((line, i) => (
                    <p key={i} className="text-sm text-gray-600 mb-1">
                      {line}
                    </p>
                  ))}
                </div>
              )}

              {conversationId && (
                <p className="mt-4 text-xs text-gray-400">
                  Session: {conversationId.slice(0, 8)}...
                </p>
              )}
            </>
          )}

          {callStatus === 'finding-draft' && (
            <>
              <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-violet-400 to-fuchsia-400 flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-violet-300">
                <Loader2 className="w-14 h-14 text-white animate-spin" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Finding your panel...
              </h2>
              <p className="text-gray-500 mb-4">
                Just a moment while we locate your draft
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>
                  Checking... ({pollAttempts}/{MAX_POLL_ATTEMPTS})
                </span>
              </div>
            </>
          )}

          {callStatus === 'draft-ready' && draftId && (
            <>
              <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-400 flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-emerald-300">
                <FileEdit className="w-14 h-14 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Your panel is ready! 🎉
              </h2>
              <p className="text-lg text-gray-600 mb-2">
                {draftName}
              </p>
              <p className="text-gray-500 mb-8">
                Review and edit your panel configuration, then create your AI interviewer.
              </p>
              <Link
                href={`/panels/drafts/${draftId}`}
                className="inline-flex items-center gap-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-10 py-5 rounded-2xl font-semibold text-xl shadow-xl shadow-emerald-200 hover:shadow-2xl hover:shadow-emerald-300 transition-all hover:scale-105"
              >
                <FileEdit className="w-6 h-6" />
                Review & Edit Panel
                <ArrowRight className="w-6 h-6" />
              </Link>
              <button
                onClick={retry}
                className="block mx-auto mt-6 text-sm text-gray-400 hover:text-gray-600 transition"
              >
                Start over with a new panel
              </button>
            </>
          )}

          {callStatus === 'error' && (
            <>
              <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-red-400 to-rose-400 flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-red-200">
                <AlertCircle className="w-14 h-14 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong</h2>
              <p className="text-gray-500 mb-8">
                {error || 'An unexpected error occurred. Please try again.'}
              </p>
              <button
                onClick={retry}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white px-8 py-4 rounded-2xl font-semibold shadow-xl shadow-violet-200 hover:shadow-2xl transition-all"
              >
                <RefreshCw className="w-5 h-5" />
                Try Again
              </button>
            </>
          )}
        </div>
      </main>

      <footer className="border-t border-gray-100 px-6 py-4 text-center bg-white/50">
        <p className="text-xs text-gray-400">Powered by ElevenLabs Conversational AI ✨</p>
      </footer>
    </div>
  );
}

export default function CreateAgentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-amber-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
        </div>
      }
    >
      <CreateAgentContent />
    </Suspense>
  );
}