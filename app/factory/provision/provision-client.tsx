// app/factory/provision/provision-client.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Database, 
  GitBranch, 
  Globe, 
  Mic,
  Brain,
  Webhook,
  Sparkles,
  ExternalLink
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

type ProvisionState =
  | 'INIT'
  | 'SUPABASE_CREATING' | 'SUPABASE_READY'
  | 'GITHUB_CREATING' | 'GITHUB_READY'
  | 'VERCEL_CREATING' | 'VERCEL_DEPLOYING' | 'VERCEL_READY'
  | 'SANDRA_CREATING' | 'SANDRA_READY'
  | 'KIRA_CREATING' | 'KIRA_READY'
  | 'WEBHOOK_REGISTERING'
  | 'COMPLETE'
  | 'FAILED';

interface ProvisionStatus {
  state: ProvisionState;
  metadata?: {
    error?: string;
    errorState?: string;
    vercelUrl?: string;
    githubRepoUrl?: string;
    sandraAgentId?: string;
    kiraAgentId?: string;
    sandraVerified?: boolean;
    kiraVerified?: boolean;
  };
  platform_name?: string;
}

interface StepConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
  states: ProvisionState[];
  description: string;
}

// ============================================================================
// STEP CONFIGURATION
// ============================================================================

const PROVISION_STEPS: StepConfig[] = [
  {
    id: 'supabase',
    label: 'Database',
    icon: <Database className="w-5 h-5" />,
    states: ['SUPABASE_CREATING', 'SUPABASE_READY'],
    description: 'Setting up Supabase database and authentication',
  },
  {
    id: 'github',
    label: 'Repository',
    icon: <GitBranch className="w-5 h-5" />,
    states: ['GITHUB_CREATING', 'GITHUB_READY'],
    description: 'Creating GitHub repository with platform code',
  },
  {
    id: 'vercel',
    label: 'Deployment',
    icon: <Globe className="w-5 h-5" />,
    states: ['VERCEL_CREATING', 'VERCEL_DEPLOYING', 'VERCEL_READY'],
    description: 'Deploying platform to Vercel',
  },
  {
    id: 'sandra',
    label: 'Sandra',
    icon: <Mic className="w-5 h-5" />,
    states: ['SANDRA_CREATING', 'SANDRA_READY'],
    description: 'Creating your AI Setup Agent',
  },
  {
    id: 'kira',
    label: 'Kira',
    icon: <Brain className="w-5 h-5" />,
    states: ['KIRA_CREATING', 'KIRA_READY'],
    description: 'Creating your AI Insights Agent',
  },
  {
    id: 'webhooks',
    label: 'Webhooks',
    icon: <Webhook className="w-5 h-5" />,
    states: ['WEBHOOK_REGISTERING'],
    description: 'Registering platform webhooks',
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getStepStatus(step: StepConfig, currentState: ProvisionState): 'pending' | 'active' | 'complete' | 'failed' {
  if (currentState === 'FAILED') {
    // Check if this step was where the failure occurred
    const allStates = PROVISION_STEPS.flatMap(s => s.states);
    const currentIndex = allStates.indexOf(currentState);
    const stepStartIndex = allStates.indexOf(step.states[0]);
    const stepEndIndex = allStates.indexOf(step.states[step.states.length - 1]);
    
    // If we haven't reached this step yet, it's pending
    if (stepStartIndex > currentIndex) return 'pending';
    // If we're past this step, it completed
    if (stepEndIndex < currentIndex) return 'complete';
    // Otherwise this step failed
    return 'failed';
  }
  
  if (currentState === 'COMPLETE') return 'complete';
  if (step.states.includes(currentState)) return 'active';
  
  // Check if this step is before or after current state
  const allStates = PROVISION_STEPS.flatMap(s => s.states);
  const currentIndex = allStates.indexOf(currentState);
  const stepEndIndex = allStates.indexOf(step.states[step.states.length - 1]);
  
  return stepEndIndex < currentIndex ? 'complete' : 'pending';
}

function getStateMessage(state: ProvisionState): string {
  const messages: Record<ProvisionState, string> = {
    INIT: 'Initializing...',
    SUPABASE_CREATING: 'Creating database...',
    SUPABASE_READY: 'Database ready',
    GITHUB_CREATING: 'Creating repository...',
    GITHUB_READY: 'Repository ready',
    VERCEL_CREATING: 'Creating deployment...',
    VERCEL_DEPLOYING: 'Deploying platform...',
    VERCEL_READY: 'Deployment ready',
    SANDRA_CREATING: 'Creating Sandra (Setup Agent)...',
    SANDRA_READY: 'Sandra ready',
    KIRA_CREATING: 'Creating Kira (Insights Agent)...',
    KIRA_READY: 'Kira ready',
    WEBHOOK_REGISTERING: 'Registering webhooks...',
    COMPLETE: 'Platform ready!',
    FAILED: 'Provisioning failed',
  };
  return messages[state] || state;
}

// ============================================================================
// STEP INDICATOR COMPONENT
// ============================================================================

function StepIndicator({ 
  step, 
  status, 
  isLast 
}: { 
  step: StepConfig; 
  status: 'pending' | 'active' | 'complete' | 'failed';
  isLast: boolean;
}) {
  const statusStyles = {
    pending: 'bg-slate-700 text-slate-400 border-slate-600',
    active: 'bg-purple-500/20 text-purple-400 border-purple-500 animate-pulse',
    complete: 'bg-green-500/20 text-green-400 border-green-500',
    failed: 'bg-red-500/20 text-red-400 border-red-500',
  };

  const lineStyles = {
    pending: 'bg-slate-700',
    active: 'bg-gradient-to-b from-purple-500 to-slate-700',
    complete: 'bg-green-500',
    failed: 'bg-red-500',
  };

  return (
    <div className="flex items-start gap-4">
      {/* Icon */}
      <div className="flex flex-col items-center">
        <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center ${statusStyles[status]}`}>
          {status === 'complete' ? (
            <CheckCircle2 className="w-6 h-6" />
          ) : status === 'failed' ? (
            <XCircle className="w-6 h-6" />
          ) : status === 'active' ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            step.icon
          )}
        </div>
        {/* Connector line */}
        {!isLast && (
          <div className={`w-0.5 h-8 mt-2 ${lineStyles[status]}`} />
        )}
      </div>

      {/* Content */}
      <div className="pt-2">
        <h3 className={`font-semibold ${status === 'pending' ? 'text-slate-400' : 'text-white'}`}>
          {step.label}
        </h3>
        <p className="text-sm text-slate-500">
          {status === 'active' ? step.description : status === 'complete' ? 'Complete' : ''}
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ProvisionClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectSlug = searchParams.get('projectSlug');
  
  const [status, setStatus] = useState<ProvisionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Poll for status updates
  const fetchStatus = useCallback(async () => {
    if (!projectSlug) return;
    
    try {
      const res = await fetch(`/api/provision/status?projectSlug=${projectSlug}`);
      if (!res.ok) {
        throw new Error('Failed to fetch status');
      }
      const data = await res.json();
      setStatus(data);
    } catch (err: any) {
      setError(err.message);
    }
  }, [projectSlug]);

  // Start polling
  useEffect(() => {
    if (!projectSlug) {
      setError('Missing projectSlug parameter');
      return;
    }

    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);
    
    return () => clearInterval(interval);
  }, [projectSlug, fetchStatus]);

  // Elapsed time counter
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(t => t + 1);
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  // Stop timer on terminal state
  useEffect(() => {
    if (status?.state === 'COMPLETE' || status?.state === 'FAILED') {
      // Timer will stop naturally
    }
  }, [status?.state]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleGoToPlatform = () => {
    if (status?.metadata?.vercelUrl) {
      window.location.href = `${status.metadata.vercelUrl}/create`;
    }
  };

  const handleRetry = () => {
    // Reset and restart
    window.location.reload();
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (error && !status) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8">
        <div className="bg-slate-900 rounded-2xl p-8 max-w-md w-full text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Error</h1>
          <p className="text-slate-400 mb-6">{error}</p>
          <button
            onClick={() => router.push('/factory')}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition"
          >
            Back to Factory
          </button>
        </div>
      </div>
    );
  }

  const currentState = status?.state || 'INIT';
  const isComplete = currentState === 'COMPLETE';
  const isFailed = currentState === 'FAILED';

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8">
      <div className="bg-slate-900 rounded-2xl p-8 max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">
            {isComplete ? '🎉 Platform Ready!' : isFailed ? '❌ Provisioning Failed' : 'Building Your Platform'}
          </h1>
          <p className="text-slate-400">
            {status?.platform_name || projectSlug}
          </p>
          {!isComplete && !isFailed && (
            <p className="text-sm text-slate-500 mt-2">
              Elapsed: {formatTime(elapsedTime)}
            </p>
          )}
        </div>

        {/* Current Status Message */}
        <div className="bg-slate-800 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            {isComplete ? (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            ) : isFailed ? (
              <XCircle className="w-5 h-5 text-red-500" />
            ) : (
              <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
            )}
            <span className={`font-medium ${isComplete ? 'text-green-400' : isFailed ? 'text-red-400' : 'text-purple-400'}`}>
              {getStateMessage(currentState)}
            </span>
          </div>
          {isFailed && status?.metadata?.error && (
            <p className="text-sm text-red-400/80 mt-2 pl-8">
              {status.metadata.error}
            </p>
          )}
        </div>

        {/* Progress Steps */}
        <div className="space-y-0 mb-8">
          {PROVISION_STEPS.map((step, index) => (
            <StepIndicator
              key={step.id}
              step={step}
              status={getStepStatus(step, currentState)}
              isLast={index === PROVISION_STEPS.length - 1}
            />
          ))}
        </div>

        {/* Agent Status Summary (when both are ready) */}
        {(status?.metadata?.sandraVerified || status?.metadata?.kiraVerified) && (
          <div className="bg-slate-800/50 rounded-lg p-4 mb-6 space-y-2">
            <h3 className="text-sm font-medium text-slate-300 mb-3">AI Agents</h3>
            
            {status.metadata.sandraVerified && (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-slate-400">Sandra (Setup Agent)</span>
                <span className="text-slate-600 text-xs">{status.metadata.sandraAgentId?.slice(0, 8)}...</span>
              </div>
            )}
            
            {status.metadata.kiraVerified && (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-slate-400">Kira (Insights Agent)</span>
                <span className="text-slate-600 text-xs">{status.metadata.kiraAgentId?.slice(0, 8)}...</span>
              </div>
            )}
          </div>
        )}

        {/* Action Button */}
        <div className="mt-6">
          {isComplete ? (
            <button
              onClick={handleGoToPlatform}
              className="w-full py-4 bg-green-600 hover:bg-green-500 text-white rounded-xl font-semibold text-lg transition-all hover:scale-[1.02] flex items-center justify-center gap-3 shadow-lg shadow-green-500/25"
            >
              <Sparkles className="w-5 h-5" />
              Go to Your Platform
              <ExternalLink className="w-5 h-5" />
            </button>
          ) : isFailed ? (
            <div className="space-y-3">
              <button
                onClick={handleRetry}
                className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition"
              >
                Try Again
              </button>
              <button
                onClick={() => router.push('/factory')}
                className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition"
              >
                Back to Factory
              </button>
            </div>
          ) : (
            <div className="w-full py-4 bg-slate-700 text-slate-400 rounded-xl font-medium text-center cursor-not-allowed">
              Building platform...
            </div>
          )}
        </div>

        {/* Links (when complete) */}
        {isComplete && status?.metadata && (
          <div className="mt-6 pt-6 border-t border-slate-800 flex justify-center gap-6">
            {status.metadata.vercelUrl && (
              <a
                href={status.metadata.vercelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-slate-400 hover:text-white flex items-center gap-1"
              >
                <Globe className="w-4 h-4" />
                Platform URL
              </a>
            )}
            {status.metadata.githubRepoUrl && (
              <a
                href={status.metadata.githubRepoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-slate-400 hover:text-white flex items-center gap-1"
              >
                <GitBranch className="w-4 h-4" />
                GitHub Repo
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
