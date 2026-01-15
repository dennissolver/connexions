// app/create/page.tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Phone, PhoneOff, Loader2, Mic, MicOff, CheckCircle, ArrowRight, Sparkles, MessageSquare } from 'lucide-react';

interface AgentConfig {
  clientName?: string;
  companyName?: string;
  interviewPurpose?: string;
  targetAudience?: string;
  interviewStyle?: string;
  tone?: string;
  timeLimit?: number;
  outputsRequired?: string[];
  keyTopics?: string[];
  keyQuestions?: string[];
  constraints?: string[];
  conversationComplete: boolean;
  summary?: string;
}

function CreateAgentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userName = searchParams.get('name') || '';

  const [callStatus, setCallStatus] = useState<'idle' | 'connecting' | 'connected' | 'ended'>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [agentConfig, setAgentConfig] = useState<AgentConfig>({ conversationComplete: false });
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [conversation, setConversation] = useState<any>(null);

  const startCall = async () => {
    setCallStatus('connecting');

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

      const conv = await Conversation.startSession({
        signedUrl: data.signedUrl,
        dynamicVariables: Object.keys(dynamicVariables).length > 0 ? dynamicVariables : undefined,
        onConnect: () => {
          setCallStatus('connected');
        },
        onDisconnect: () => {
          setCallStatus('ended');
          checkConversationComplete();
        },
        onMessage: (message: any) => {
          if (message.message) {
            setTranscript(prev => [...prev, `${message.source}: ${message.message}`]);
          }
        },
        onError: (error: any) => {
          console.error('ElevenLabs error:', error);
          setCallStatus('idle');
        },
      });

      setConversation(conv);

    } catch (error) {
      console.error('Failed to start call:', error);
      setCallStatus('idle');
    }
  };

  const endCall = async () => {
    if (conversation) {
      await conversation.endSession();
      setConversation(null);
    }
    setCallStatus('ended');
    checkConversationComplete();
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

  const checkConversationComplete = async () => {
    try {
      const response = await fetch('/api/setup-agent/voice/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript }),
      });

      const data = await response.json();

      if (data.config) {
        setAgentConfig(data.config);
        if (data.config.conversationComplete || data.config.summary) {
          setShowConfirmation(true);
        }
      }
    } catch (error) {
      console.error('Failed to extract config:', error);
      // Still show confirmation if we have transcript
      if (transcript.length > 5) {
        setShowConfirmation(true);
      }
    }
  };

  const proceedToConfirmation = () => {
    sessionStorage.setItem('agentConfig', JSON.stringify(agentConfig));
    sessionStorage.setItem('setupTranscript', JSON.stringify(transcript));
    router.push('/confirm');
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
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="text-center max-w-lg">

          {/* Idle State */}
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
                  : "Start a voice conversation with Sandra. Just tell her what you need — she'll design a custom AI interviewer for you."
                }
              </p>
              <button
                onClick={startCall}
                className="inline-flex items-center gap-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-10 py-5 rounded-2xl font-semibold text-xl shadow-xl shadow-emerald-200 hover:shadow-2xl hover:shadow-emerald-300 transition-all hover:scale-105"
              >
                <Phone className="w-6 h-6" />
                Start Call with Sandra
              </button>
              <p className="text-sm text-gray-400 mt-6">
                ✨ Takes about 3-5 minutes
              </p>
            </>
          )}

          {/* Connecting State */}
          {callStatus === 'connecting' && (
            <>
              <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-violet-400 to-fuchsia-400 flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-violet-300">
                <Loader2 className="w-14 h-14 text-white animate-spin" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Connecting to Sandra...</h2>
              <p className="text-gray-500">
                Setting up your voice session
              </p>
            </>
          )}

          {/* Connected State */}
          {callStatus === 'connected' && (
            <>
              <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-400 flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-emerald-300 animate-pulse">
                <Mic className="w-14 h-14 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-emerald-600 mb-4">Connected with Sandra</h2>
              <p className="text-gray-500 mb-8">
                Speak naturally — Sandra is listening 🎙️
              </p>

              {/* Call Controls */}
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

              {/* Live Transcript Preview */}
              {transcript.length > 0 && (
                <div className="mt-10 text-left bg-white rounded-2xl p-5 max-h-48 overflow-y-auto border border-gray-100 shadow-sm">
                  <p className="text-xs text-gray-400 mb-3 font-medium">Live transcript</p>
                  {transcript.slice(-5).map((line, i) => (
                    <p key={i} className="text-sm text-gray-600 mb-1">{line}</p>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Call Ended State */}
          {callStatus === 'ended' && !showConfirmation && (
            <>
              <div className="w-32 h-32 rounded-3xl bg-gray-100 flex items-center justify-center mx-auto mb-8">
                <Loader2 className="w-14 h-14 text-violet-500 animate-spin" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Processing...</h2>
              <p className="text-gray-500">
                Sandra is preparing your panel configuration
              </p>
            </>
          )}

          {/* Confirmation Ready */}
          {showConfirmation && (
            <>
              <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-400 flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-emerald-300">
                <CheckCircle className="w-14 h-14 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Your panel is ready! 🎉</h2>
              <p className="text-gray-500 mb-8">
                Sandra captured everything from your conversation. Review and confirm to create your AI interviewer.
              </p>

              {agentConfig.summary && (
                <div className="bg-white rounded-2xl p-6 mb-8 text-left border border-gray-100 shadow-sm">
                  <p className="text-gray-700">{agentConfig.summary}</p>
                </div>
              )}

              <button
                onClick={proceedToConfirmation}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white px-8 py-4 rounded-2xl font-semibold text-lg shadow-xl shadow-violet-200 hover:shadow-2xl transition-all"
              >
                Review & Create
                <ArrowRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 px-6 py-4 text-center bg-white/50">
        <p className="text-xs text-gray-400">
          Powered by ElevenLabs Conversational AI ✨
        </p>
      </footer>
    </div>
  );
}

export default function CreateAgentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-amber-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    }>
      <CreateAgentContent />
    </Suspense>
  );
}