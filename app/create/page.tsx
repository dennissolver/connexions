// app/create/page.tsx
'use client';

import { useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Phone, PhoneOff, Loader2, Mic, MicOff,
  MessageSquare, AlertCircle, RefreshCw
} from 'lucide-react';

type CallStatus = 'idle' | 'connecting' | 'connected' | 'polling' | 'error';

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

  const MAX_POLL_ATTEMPTS = 20;
  const POLL_INTERVAL = 1500;

  // Poll for draft after call ends
  const pollForDraft = useCallback(async (convId: string, attempt: number = 0) => {
    if (attempt >= MAX_POLL_ATTEMPTS) {
      setError('Could not find your panel draft. Sandra may not have saved it yet. Please try again.');
      setCallStatus('error');
      return;
    }

    setPollAttempts(attempt + 1);

    try {
      const res = await fetch(`/api/panels/drafts/by-conversation/${convId}`);

      if (res.ok) {
        const draft = await res.json();
        if (draft.found && draft.id) {
          // Success! Redirect to draft review
          router.push(`/panels/drafts/${draft.id}`);
          return;
        }
      }

      // Not found yet, keep polling
      setTimeout(() => pollForDraft(convId, attempt + 1), POLL_INTERVAL);
    } catch (err) {
      console.error('[poll] Error:', err);
      setTimeout(() => pollForDraft(convId, attempt + 1), POLL_INTERVAL);
    }
  }, [router]);

  // Handle call end
  const handleCallEnd = useCallback((convId: string | null) => {
    setCallStatus('polling');

    if (convId) {
      // Start polling for the draft Sandra created
      pollForDraft(convId);
    } else {
      setError('No conversation ID available. Please try again.');
      setCallStatus('error');
    }
  }, [pollForDraft]);

  const startCall = async () => {
    setCallStatus('connecting');
    setError(null);
    setTranscript([]);
    setPollAttempts(0);

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

      // Build dynamic variables for personalization
      const dynamicVariables: Record<string, string> = {};
      if (userName) {
        dynamicVariables.user_name = userName;
        dynamicVariables.first_name = userName.split(' ')[0];
      }

      let sessionConversationId: string | null = null;

      const conv = await Conversation.startSession({
        signedUrl: data.signedUrl,
        dynamicVariables: Object.keys(dynamicVariables).length > 0 ? dynamicVariables : undefined,
        onConnect: ({ conversationId: convId }: { conversationId?: string }) => {
          console.log('[call] Connected, conversation ID:', convId);
          sessionConversationId = convId || null;
          setConversationId(convId || null);
          setCallStatus('connected');
        },
        onDisconnect: () => {
          console.log('[call] Disconnected');
          handleCallEnd(sessionConversationId);
        },
        onMessage: (message: any) => {
          if (message.message) {
            setTranscript(prev => [...prev, `${message.source}: ${message.message}`]);
          }
        },
        onError: (error: any) => {
          console.error('[call] Error:', error);
          setError(error.message || 'Call error occurred');
          setCallStatus('error');
        },
      });

      setConversation(conv);

    } catch (error: any) {
      console.error('[call] Failed to start:', error);
      setError(error.message || 'Failed to start call');
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
    handleCallEnd(conversationId);
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
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-amber-50">
      {/* Header */}
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

      {/* Main Content */}
      <main className="flex-1 flex flex-col items