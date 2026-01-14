// app/demo/DemoClient.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Phone, PhoneOff, Loader2, CheckCircle,
  ArrowRight, MessageSquare
} from 'lucide-react';
import VoiceAvatar from '../components/VoiceAvatar';

type DemoState =
  | 'loading'
  | 'ready_for_setup'
  | 'setup_in_progress'
  | 'setup_complete'
  | 'parsing'
  | 'creating_trial'
  | 'trial_ready'
  | 'trial_in_progress'
  | 'trial_complete'
  | 'results_sent'
  | 'error';

interface LeadData {
  name: string;
  company: string;
  email: string;
  website?: string;
  status: string;
  trialAgentId?: string;
  interviewSpec?: {
    interview_purpose?: string;
    target_audience?: string;
    tone?: string;
    estimated_duration_mins?: number;
  };
}

export default function DemoClient() {
  const searchParams = useSearchParams();
  const leadId = searchParams.get('leadId');
  const widgetContainerRef = useRef<HTMLDivElement>(null);
  const widgetMountedRef = useRef(false);

  const [state, setState] = useState<DemoState>('loading');
  const [leadData, setLeadData] = useState<LeadData | null>(null);
  const [error, setError] = useState('');
  const [showWidget, setShowWidget] = useState(false);
  const [currentAgentId, setCurrentAgentId] = useState<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  const SETUP_AGENT_ID = process.env.NEXT_PUBLIC_DEMO_SETUP_AGENT_ID || '';

  // Load ElevenLabs script on mount
  useEffect(() => {
    const existingScript = document.querySelector('script[src*="elevenlabs.io/convai-widget"]');
    if (existingScript) {
      setScriptLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://elevenlabs.io/convai-widget/index.js';
    script.async = true;
    script.onload = () => {
      console.log('[Demo] ElevenLabs script loaded');
      setScriptLoaded(true);
    };
    document.body.appendChild(script);
  }, []);

  // Mount widget with delay to avoid StrictMode abort
  useEffect(() => {
    if (!showWidget || !currentAgentId || !scriptLoaded || !widgetContainerRef.current) {
      return;
    }

    // Prevent double-mount in StrictMode
    if (widgetMountedRef.current) {
      console.log('[Demo] Widget already mounted, skipping');
      return;
    }

    console.log('[Demo] Mounting widget with delay...');
    
    const timeoutId = setTimeout(() => {
      if (widgetContainerRef.current && !widgetMountedRef.current) {
        widgetMountedRef.current = true;
        widgetContainerRef.current.innerHTML = `<elevenlabs-convai agent-id="${currentAgentId}"></elevenlabs-convai>`;
        console.log('[Demo] Widget mounted:', currentAgentId);
      }
    }, 100);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [showWidget, currentAgentId, scriptLoaded]);

  const checkStatus = useCallback(async () => {
    if (!leadId) return;

    try {
      const res = await fetch(`/api/demo/status/${leadId}`);
      const data = await res.json();

      if (res.ok) {
        setLeadData(prev => ({ ...prev, ...data }));

        switch (data.status) {
          case 'new':
            setState('ready_for_setup');
            break;
          case 'setup_started':
            setState('setup_in_progress');
            break;
          case 'setup_complete':
            setState('setup_complete');
            break;
          case 'parsing':
            setState('parsing');
            break;
          case 'creating_trial':
            setState('creating_trial');
            break;
          case 'trial_ready':
            setState('trial_ready');
            if (data.trialAgentId) {
              setCurrentAgentId(data.trialAgentId);
            }
            break;
          case 'trial_started':
            setState('trial_in_progress');
            break;
          case 'trial_complete':
            setState('trial_complete');
            break;
          case 'results_sent':
            setState('results_sent');
            break;
          case 'error':
            setState('error');
            setError(data.error_message || 'Something went wrong');
            break;
        }
      }
    } catch (err) {
      console.error('Status check failed:', err);
    }
  }, [leadId]);

  useEffect(() => {
    if (!leadId) {
      setError('No demo session found. Please start from the homepage.');
      setState('error');
      return;
    }

    checkStatus();

    const interval = setInterval(() => {
      if (['setup_complete', 'parsing', 'creating_trial'].includes(state)) {
        checkStatus();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [leadId, state, checkStatus]);

  const startSetupCall = async () => {
    console.log('[Demo] Starting setup call');
    widgetMountedRef.current = false; // Reset mount flag
    setCurrentAgentId(SETUP_AGENT_ID);
    setState('setup_in_progress');
    setShowWidget(true);

    await fetch('/api/demo/update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId, status: 'setup_started' }),
    });
  };

  const startTrialInterview = async () => {
    console.log('[Demo] Starting trial interview');
    widgetMountedRef.current = false; // Reset mount flag
    setState('trial_in_progress');
    setShowWidget(true);

    await fetch('/api/demo/update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId, status: 'trial_started' }),
    });
  };

  const endCall = async () => {
    console.log('[Demo] Ending call');
    setShowWidget(false);
    widgetMountedRef.current = false;
    
    if (widgetContainerRef.current) {
      widgetContainerRef.current.innerHTML = '';
    }
    
    if (state === 'setup_in_progress') {
      setState('setup_complete');
      await fetch('/api/demo/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, status: 'setup_complete' }),
      });
    } else if (state === 'trial_in_progress') {
      setState('trial_complete');
      await fetch('/api/demo/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, status: 'trial_complete' }),
      });
    }
  };

  // Widget container - always rendered but hidden when not in use
  const WidgetContainer = () => (
    <div 
      ref={widgetContainerRef} 
      className={`mb-6 min-h-[80px] ${showWidget ? 'block' : 'hidden'}`}
    />
  );

  const renderContent = () => {
    switch (state) {
      case 'loading':
        return (
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
            <p className="text-slate-400">Loading your demo session...</p>
          </div>
        );

      case 'ready_for_setup':
        return (
          <div className="text-center max-w-lg mx-auto">
            <VoiceAvatar size="lg" label="AI Setup Agent" />
            <h1 className="text-3xl font-bold mb-4">Welcome, {leadData?.name}!</h1>
            <p className="text-slate-300 mb-2">
              Let us design your custom AI interviewer for <strong>{leadData?.company}</strong>.
            </p>
            <p className="text-slate-400 mb-8">
              Sandra will ask you a few questions about what you want to build.
            </p>
            <button
              onClick={startSetupCall}
              disabled={!SETUP_AGENT_ID || !scriptLoaded}
              className="inline-flex items-center gap-3 bg-green-600 hover:bg-green-500 px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:scale-105 shadow-lg shadow-green-500/25 disabled:opacity-50"
            >
              <Phone className="w-6 h-6" />
              {scriptLoaded ? 'Start Setup Call' : 'Loading...'}
            </button>
            <WidgetContainer />
          </div>
        );

      case 'setup_in_progress':
        return (
          <div className="text-center max-w-lg mx-auto">
            <VoiceAvatar isActive isSpeaking size="lg" label="Speaking with Sandra..." />
            <h2 className="text-2xl font-bold text-green-400 mb-4">Call in Progress</h2>
            <p className="text-slate-400 mb-6">
              Speak naturally. When done, click End Call.
            </p>
            <WidgetContainer />
            <button
              onClick={endCall}
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-500 px-6 py-3 rounded-lg font-medium transition"
            >
              <PhoneOff className="w-5 h-5" />
              End Call
            </button>
          </div>
        );

      case 'setup_complete':
      case 'parsing':
      case 'creating_trial':
        return (
          <div className="text-center max-w-lg mx-auto">
            <VoiceAvatar isActive size="lg" label="Building your interview..." />
            <h2 className="text-2xl font-bold mb-4">Creating Your Trial Interview</h2>
            <p className="text-slate-400 mb-8">
              Analyzing your requirements...
            </p>
            <div className="space-y-3 text-left bg-slate-900 rounded-xl p-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-slate-300">Setup conversation captured</span>
              </div>
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                <span className="text-purple-400">Processing...</span>
              </div>
            </div>
          </div>
        );

      case 'trial_ready':
        return (
          <div className="text-center max-w-lg mx-auto">
            <VoiceAvatar size="lg" label="Ready to interview you!" />
            <h2 className="text-2xl font-bold text-green-400 mb-4">Your Trial is Ready!</h2>
            <p className="text-slate-400 mb-6">
              Experience your custom interview as an interviewee.
            </p>
            <button
              onClick={startTrialInterview}
              className="inline-flex items-center gap-3 bg-purple-600 hover:bg-purple-500 px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:scale-105"
            >
              <MessageSquare className="w-6 h-6" />
              Start Trial Interview
            </button>
            <WidgetContainer />
          </div>
        );

      case 'trial_in_progress':
        return (
          <div className="text-center max-w-lg mx-auto">
            <VoiceAvatar isActive isSpeaking size="lg" label="Interview in progress..." />
            <h2 className="text-2xl font-bold text-green-400 mb-4">Trial Interview</h2>
            <WidgetContainer />
            <button
              onClick={endCall}
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-500 px-6 py-3 rounded-lg font-medium transition"
            >
              <PhoneOff className="w-5 h-5" />
              End Interview
            </button>
          </div>
        );

      case 'trial_complete':
      case 'results_sent':
        return (
          <div className="text-center max-w-lg mx-auto">
            <VoiceAvatar size="lg" label="Interview complete!" />
            <h2 className="text-3xl font-bold text-green-400 mb-4">Trial Complete!</h2>
            <p className="text-slate-400 mb-8">
              Results sent to <strong>{leadData?.email}</strong>
            </p>
            <Link
              href={`/demo/complete?leadId=${leadId}`}
              className="inline-flex items-center gap-2 bg-white text-slate-900 px-6 py-3 rounded-lg font-semibold hover:bg-slate-200 transition"
            >
              See Full Details
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        );

      case 'error':
        return (
          <div className="text-center max-w-lg mx-auto">
            <h2 className="text-2xl font-bold text-red-400 mb-4">Something Went Wrong</h2>
            <p className="text-slate-400 mb-8">{error}</p>
            <Link href="/" className="bg-purple-600 hover:bg-purple-500 px-6 py-3 rounded-lg">
              Start Over
            </Link>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      {renderContent()}
    </div>
  );
}
