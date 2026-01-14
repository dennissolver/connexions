'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Phone, PhoneOff, Loader2, Bot, Mic, MicOff, CheckCircle, ArrowRight } from 'lucide-react';

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

export default function CreateAgentPage() {
  const router = useRouter();
  const [callStatus, setCallStatus] = useState<'idle' | 'connecting' | 'connected' | 'ended'>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [agentConfig, setAgentConfig] = useState<AgentConfig>({ conversationComplete: false });
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [conversation, setConversation] = useState<any>(null);

  const startCall = async () => {
    setCallStatus('connecting');
    
    try {
      // Get signed URL from our API
      const response = await fetch('/api/setup-agent/voice/start', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to start call');
      }

      // Initialize ElevenLabs conversation
      const { Conversation } = await import('@elevenlabs/client');
      
      const conv = await Conversation.startSession({
        agentId: data.agentId,
        signedUrl: data.signedUrl,
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
    }
  };

  const proceedToConfirmation = () => {
    sessionStorage.setItem('agentConfig', JSON.stringify(agentConfig));
    sessionStorage.setItem('setupTranscript', JSON.stringify(transcript));
    router.push('/confirm');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
            <Bot className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="font-semibold">Setup Agent</h1>
            <p className="text-sm text-slate-400">Voice-powered interviewer design</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="text-center max-w-lg">
          
          {/* Idle State */}
          {callStatus === 'idle' && (
            <>
              <div className="w-32 h-32 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-8">
                <Phone className="w-12 h-12 text-purple-400" />
              </div>
              <h2 className="text-2xl font-bold mb-4">Ready to design your AI interviewer</h2>
              <p className="text-slate-400 mb-8">
                Start a voice conversation with our Setup Agent. Just tell us what you need â€” 
                we'll design a custom AI interviewer based on your requirements.
              </p>
              <button
                onClick={startCall}
                className="inline-flex items-center gap-3 bg-green-600 hover:bg-green-500 text-white px-8 py-4 rounded-2xl font-semibold text-lg transition-all hover:scale-105 shadow-lg shadow-green-500/25"
              >
                <Phone className="w-6 h-6" />
                Start Call
              </button>
              <p className="text-sm text-slate-500 mt-4">
                Takes about 3-5 minutes
              </p>
            </>
          )}

          {/* Connecting State */}
          {callStatus === 'connecting' && (
            <>
              <div className="w-32 h-32 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-8">
                <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
              </div>
              <h2 className="text-2xl font-bold mb-4">Connecting...</h2>
              <p className="text-slate-400">
                Setting up your voice session
              </p>
            </>
          )}

          {/* Connected State */}
          {callStatus === 'connected' && (
            <>
              <div className="w-32 h-32 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse">
                <Mic className="w-12 h-12 text-green-400" />
              </div>
              <h2 className="text-2xl font-bold mb-4 text-green-400">Call in progress</h2>
              <p className="text-slate-400 mb-8">
                Speak naturally â€” the Setup Agent is listening
              </p>
              
              {/* Call Controls */}
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={toggleMute}
                  className={`p-4 rounded-full transition ${
                    isMuted 
                      ? 'bg-yellow-500/20 text-yellow-400' 
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </button>
                <button
                  onClick={endCall}
                  className="p-4 bg-red-600 hover:bg-red-500 text-white rounded-full transition"
                >
                  <PhoneOff className="w-6 h-6" />
                </button>
              </div>

              {/* Live Transcript Preview */}
              {transcript.length > 0 && (
                <div className="mt-8 text-left bg-slate-900 rounded-xl p-4 max-h-48 overflow-y-auto">
                  <p className="text-xs text-slate-500 mb-2">Live transcript</p>
                  {transcript.slice(-5).map((line, i) => (
                    <p key={i} className="text-sm text-slate-400">{line}</p>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Call Ended State */}
          {callStatus === 'ended' && !showConfirmation && (
            <>
              <div className="w-32 h-32 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-8">
                <PhoneOff className="w-12 h-12 text-slate-500" />
              </div>
              <h2 className="text-2xl font-bold mb-4">Call ended</h2>
              <p className="text-slate-400 mb-8">
                Processing your conversation...
              </p>
              <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto" />
            </>
          )}

          {/* Confirmation Ready */}
          {showConfirmation && (
            <>
              <div className="w-32 h-32 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-8">
                <CheckCircle className="w-12 h-12 text-green-400" />
              </div>
              <h2 className="text-2xl font-bold mb-4 text-green-400">Ready to create your interviewer!</h2>
              <p className="text-slate-400 mb-8">
                I've captured everything from our conversation. Review and confirm to create your AI interviewer.
              </p>
              
              {agentConfig.summary && (
                <div className="bg-slate-900 rounded-xl p-4 mb-8 text-left">
                  <p className="text-sm text-slate-300">{agentConfig.summary}</p>
                </div>
              )}

              <button
                onClick={proceedToConfirmation}
                className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-xl font-medium transition"
              >
                Review & Create
                <ArrowRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 px-4 py-4 text-center">
        <p className="text-xs text-slate-500">
          Powered by ElevenLabs Conversational AI
        </p>
      </footer>
    </div>
  );
}

