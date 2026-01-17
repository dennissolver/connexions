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

/* ============================================================================
 * TYPES
 * ==========================================================================*/

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

/* ============================================================================
 * STEP CONFIG
 * ==========================================================================*/

const PROVISION_STEPS: StepConfig[] = [
  { id: 'supabase', label: 'Database', icon: <Database className="w-5 h-5" />, states: ['SUPABASE_CREATING','SUPABASE_READY'], description: 'Setting up database and authentication' },
  { id: 'github', label: 'Repository', icon: <GitBranch className="w-5 h-5" />, states: ['GITHUB_CREATING','GITHUB_READY'], description: 'Creating GitHub repository' },
  { id: 'vercel', label: 'Deployment', icon: <Globe className="w-5 h-5" />, states: ['VERCEL_CREATING','VERCEL_DEPLOYING','VERCEL_READY'], description: 'Deploying platform to Vercel' },
  { id: 'sandra', label: 'Sandra', icon: <Mic className="w-5 h-5" />, states: ['SANDRA_CREATING','SANDRA_READY'], description: 'Creating your setup agent' },
  { id: 'kira', label: 'Kira', icon: <Brain className="w-5 h-5" />, states: ['KIRA_CREATING','KIRA_READY'], description: 'Creating your insights agent' },
  { id: 'webhooks', label: 'Webhooks', icon: <Webhook className="w-5 h-5" />, states: ['WEBHOOK_REGISTERING'], description: 'Registering platform webhooks' },
];

/* ============================================================================
 * HELPERS
 * ==========================================================================*/

function getStateMessage(state: ProvisionState): string {
  const map: Record<ProvisionState, string> = {
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
  return map[state];
}

/* ============================================================================
 * MAIN COMPONENT
 * ==========================================================================*/

export default function ProvisionClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectSlug = searchParams.get('projectSlug');

  const [status, setStatus] = useState<ProvisionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const fetchStatus = useCallback(async () => {
    if (!projectSlug) return;
    try {
      const res = await fetch(`/api/provision/status?projectSlug=${projectSlug}`);
      const data = await res.json();
      setStatus(data);
    } catch (e: any) {
      setError(e.message);
    }
  }, [projectSlug]);

  useEffect(() => {
    fetchStatus();
    const poll = setInterval(fetchStatus, 2000);
    return () => clearInterval(poll);
  }, [fetchStatus]);

  useEffect(() => {
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const state = status?.state ?? 'INIT';
  const isComplete = state === 'COMPLETE';
  const isFailed = state === 'FAILED';

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8">
      <div className="bg-slate-900 rounded-2xl p-8 max-w-lg w-full">

        {/* HEADER */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white">
            {isComplete ? '🎉 Platform Ready!' : isFailed ? '❌ Setup Failed' : 'Building Your Platform'}
          </h1>
          <p className="text-slate-400 mt-1">{status?.platform_name || projectSlug}</p>
          {!isComplete && !isFailed && (
            <p className="text-sm text-slate-500 mt-2">Elapsed: {formatTime(elapsed)}</p>
          )}
        </div>

        {/* EXPECTATION SETTING (NEW) */}
        {!isComplete && !isFailed && (
          <div className="mb-6 bg-slate-800/60 border border-slate-700 rounded-lg p-4 text-sm text-slate-300">
            <p className="mb-2">
              We’re setting everything up automatically — database, AI agents,
              code repository, and deployment.
            </p>
            <p className="mb-2">
              <strong>Typical setup time:</strong> 10–20 minutes.
              Occasionally it may take a little longer depending on external services.
            </p>
            <p className="text-slate-400">
              You don’t need to stay on this page. Feel free to grab a coffee ☕
              and come back shortly — everything continues in the background.
            </p>
          </div>
        )}

        {/* CURRENT STATE */}
        <div className="bg-slate-800 rounded-lg p-4 mb-4 flex items-center gap-3">
          {isComplete ? <CheckCircle2 className="text-green-500" /> :
           isFailed ? <XCircle className="text-red-500" /> :
           <Loader2 className="animate-spin text-purple-400" />}
          <span className="text-purple-300 font-medium">{getStateMessage(state)}</span>
        </div>

        {/* CONTEXTUAL REASSURANCE (NEW) */}
        {state === 'GITHUB_CREATING' && (
          <p className="text-xs text-slate-500 mb-4">
            This step can take a few minutes while your repository is prepared.
          </p>
        )}

        {state === 'VERCEL_DEPLOYING' && (
          <p className="text-xs text-slate-500 mb-4">
            Deployments often take several minutes on first setup.
          </p>
        )}

        {/* ACTION */}
        {isComplete && status?.metadata?.vercelUrl && (
          <button
            onClick={() => window.location.href = `${status.metadata!.vercelUrl}/create`}
            className="w-full py-4 bg-green-600 hover:bg-green-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2"
          >
            <Sparkles className="w-5 h-5" />
            Go to Your Platform
            <ExternalLink className="w-5 h-5" />
          </button>
        )}

        {isFailed && (
          <button
            onClick={() => router.push('/factory')}
            className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
          >
            Back to Factory
          </button>
        )}

      </div>
    </div>
  );
}
