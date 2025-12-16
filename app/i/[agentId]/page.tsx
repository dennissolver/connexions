'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  Phone,
  PhoneOff,
  Loader2,
  Mic,
  MicOff,
  Bot,
  CheckCircle
} from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  company_name: string;
  logo_url?: string;
  primary_color: string;
  background_color: string;
  welcome_message?: string;
  closing_message?: string;
  estimated_duration_mins: number;
  elevenlabs_agent_id: string;
}

type Stage = 'loading' | 'welcome' | 'call' | 'complete' | 'error';

export default function VoiceInterviewPage() {
  const params = useParams();

  // Accept demo-* or normal ids
  const rawAgentId = params.agentId as string;
  const agentId = rawAgentId.replace(/^demo-/, '');

  const [stage, setStage] = useState<Stage>('loading');
  const [agent, setAgent] = useState<Agent | null>(null);
  const [error, setError] = useState('');
  const [callStatus, setCallStatus] =
    useState<'idle' | 'connecting' | 'connected'>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [conversation, setConversation] = useState<any>(null);
  const [interviewId, setInterviewId] = useState<string | null>(null);

  /* ----------------------------------------
     Load agent on mount
  ---------------------------------------- */
  useEffect(() => {
    loadAgent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  const loadAgent = async () => {
    try {
      const res = await fetch(`/api/agents/${agentId}`, {
        cache: 'no-store'
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Interview not found');
      }

      setAgent(json.agent ?? json);
      setStage('welcome');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load interviews');
      setStage('error');
    }
  };

  /* ----------------------------------------
     Start voice call
  ---------------------------------------- */
  const startCall = async () => {
    if (!agent) return;

    setStage('call');
    setCallStatus('connecting');

    try {
      const res = await fetch('/api/interview/voice/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: agent.id,
          elevenLabsAgentId: agent.elevenlabs_agent_id
        })
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Failed to start call');
      }

      setInterviewId(json.interviewId);

      const { Conversation } = await import('@elevenlabs/client');

      const conv = await Conversation.startSession({
        agentId: json.elevenLabsAgentId || agent.elevenlabs_agent_id,
        signedUrl: json.signedUrl,
        onConnect: () => setCallStatus('connected'),
        onDisconnect: () => {
          setStage('complete');
          saveInterview('completed');
        },
        onError: (err: any) => {
          console.error('Voice error:', err);
          setError('Call disconnected unexpectedly');
          setStage('error');
        }
      });

      setConversation(conv);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to start call');
      setStage('error');
    }
  };

  /* ----------------------------------------
     End call
  ---------------------------------------- */
  const endCall = async () => {
    if (conversation) {
      await conversation.endSession();
      setConversation(null);
    }
    setStage('complete');
    saveInterview('completed');
  };

  /* ----------------------------------------
     Mute / Unmute
  ---------------------------------------- */
  const toggleMute = () => {
    if (!conversation) return;
    isMuted ? conversation.unmute() : conversation.mute();
    setIsMuted(!isMuted);
  };

  /* ----------------------------------------
     Save interviews state
  ---------------------------------------- */
  const saveInterview = async (status: string) => {
    if (!interviewId) return;
    try {
      await fetch('/api/interview/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interviewId, status })
      });
    } catch (err) {
      console.error('Failed to save interviews', err);
    }
  };

  /* ----------------------------------------
     Branding
  ---------------------------------------- */
  const primaryColor = agent?.primary_color || '#8B5CF6';
  const backgroundColor = agent?.background_color || '#0F172A';

  /* ----------------------------------------
     UI
  ---------------------------------------- */
  return (
    <div
      className="min-h-screen text-white flex flex-col"
      style={{ backgroundColor }}
    >
      {/* Header */}
      <header className="border-b border-white/10 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          {agent?.logo_url && (
            <img
              src={agent.logo_url}
              alt=""
              className="w-10 h-10 rounded-lg object-contain"
            />
          )}
          <div>
            <h1 className="font-semibold">{agent?.name || 'Interview'}</h1>
            <p className="text-sm text-white/60">
              {agent?.company_name}
            </p>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="text-center max-w-lg">

          {stage === 'loading' && (
            <Loader2 className="w-12 h-12 animate-spin mx-auto text-white/50" />
          )}

          {stage === 'error' && (
            <>
              <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                😕
              </div>
              <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
              <p className="text-white/60">{error}</p>
            </>
          )}

          {stage === 'welcome' && agent && (
            <>
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{ backgroundColor: `${primaryColor}20` }}
              >
                <Bot className="w-10 h-10" style={{ color: primaryColor }} />
              </div>

              <h2 className="text-2xl font-bold mb-4">
                {agent.welcome_message ||
                  `Welcome to your interview with ${agent.company_name}`}
              </h2>

              <p className="text-white/60 mb-8">
                This will take about {agent.estimated_duration_mins} minutes.
              </p>

              <button
                onClick={startCall}
                className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold text-lg hover:scale-105 transition"
                style={{
                  backgroundColor: primaryColor,
                  boxShadow: `0 10px 40px ${primaryColor}40`
                }}
              >
                <Phone className="w-6 h-6" />
                Start Interview
              </button>
            </>
          )}

          {stage === 'call' && (
            <>
              <div
                className={`w-32 h-32 rounded-full flex items-center justify-center mx-auto mb-8 ${
                  callStatus === 'connected' ? 'animate-pulse' : ''
                }`}
                style={{
                  backgroundColor:
                    callStatus === 'connected'
                      ? '#22c55e20'
                      : `${primaryColor}20`
                }}
              >
                {callStatus === 'connecting' ? (
                  <Loader2 className="w-12 h-12 animate-spin" />
                ) : (
                  <Mic className="w-12 h-12 text-green-400" />
                )}
              </div>

              <div className="flex justify-center gap-4">
                <button
                  onClick={toggleMute}
                  className={`p-4 rounded-full ${
                    isMuted
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-white/10'
                  }`}
                >
                  {isMuted ? <MicOff /> : <Mic />}
                </button>

                <button
                  onClick={endCall}
                  className="p-4 bg-red-600 rounded-full"
                >
                  <PhoneOff />
                </button>
              </div>
            </>
          )}

          {stage === 'complete' && (
            <>
              <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-400" />
              </div>
              <h2 className="text-2xl font-bold mb-4">
                Interview complete
              </h2>
              <p className="text-white/60">
                {agent?.closing_message ||
                  'Thank you for your time.'}
              </p>
            </>
          )}
        </div>
      </main>

      <footer className="border-t border-white/10 px-4 py-4 text-center text-xs text-white/40">
        Powered by AI Agent Interviews
      </footer>
    </div>
  );
}
