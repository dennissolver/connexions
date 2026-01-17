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
  ExternalLink,
  Shield,
  Clock,
} from 'lucide-react';

/* ============================================================================
 * TYPES
 * ==========================================================================*/

type ServiceState = 'PENDING' | 'CREATING' | 'VERIFYING' | 'WAITING' | 'READY' | 'FAILED';

type ServiceName =
  | 'supabase'
  | 'github'
  | 'vercel'
  | 'supabase-config'
  | 'sandra'
  | 'kira'
  | 'webhooks';

interface ServiceStates {
  supabase: ServiceState;
  github: ServiceState;
  vercel: ServiceState;
  'supabase-config': ServiceState;
  sandra: ServiceState;
  kira: ServiceState;
  webhooks: ServiceState;
}

interface ProvisionStatus {
  project_slug: string;
  status: 'running' | 'complete' | 'failed';
  supabase_state: ServiceState;
  github_state: ServiceState;
  vercel_state: ServiceState;
  'supabase-config_state'?: ServiceState;
  sandra_state: ServiceState;
  kira_state: ServiceState;
  webhooks_state: ServiceState;
  metadata?: {
    error?: string;
    vercel_url?: string;
    platform_name?: string;
    company_name?: string;
  };
}

interface ServiceConfig {
  id: ServiceName;
  label: string;
  icon: React.ReactNode;
  description: Record<ServiceState, string>;
}

/* ============================================================================
 * SERVICE CONFIG
 * ==========================================================================*/

const SERVICES: ServiceConfig[] = [
  {
    id: 'supabase',
    label: 'Database',
    icon: <Database className="w-5 h-5" />,
    description: {
      PENDING: 'Waiting to start...',
      CREATING: 'Creating Supabase project...',
      VERIFYING: 'Verifying database & fetching keys...',
      WAITING: 'Waiting for database to be ready...',
      READY: 'Database ready',
      FAILED: 'Database setup failed',
    },
  },
  {
    id: 'github',
    label: 'Repository',
    icon: <GitBranch className="w-5 h-5" />,
    description: {
      PENDING: 'Waiting to start...',
      CREATING: 'Creating GitHub repository...',
      VERIFYING: 'Verifying repository...',
      WAITING: 'Waiting for repository...',
      READY: 'Repository ready',
      FAILED: 'Repository setup failed',
    },
  },
  {
    id: 'vercel',
    label: 'Deployment',
    icon: <Globe className="w-5 h-5" />,
    description: {
      PENDING: 'Waiting for repository & database...',
      CREATING: 'Creating Vercel project...',
      VERIFYING: 'Deploying & verifying...',
      WAITING: 'Waiting for deployment...',
      READY: 'Deployment ready',
      FAILED: 'Deployment failed',
    },
  },
  {
    id: 'supabase-config',
    label: 'Auth Config',
    icon: <Shield className="w-5 h-5" />,
    description: {
      PENDING: 'Waiting for deployment...',
      CREATING: 'Configuring auth URLs...',
      VERIFYING: 'Verifying configuration...',
      WAITING: 'Waiting for configuration...',
      READY: 'Auth configured',
      FAILED: 'Auth config failed',
    },
  },
  {
    id: 'sandra',
    label: 'Setup Agent',
    icon: <Mic className="w-5 h-5" />,
    description: {
      PENDING: 'Waiting for deployment...',
      CREATING: 'Creating Sandra agent...',
      VERIFYING: 'Verifying Sandra...',
      WAITING: 'Waiting for Sandra...',
      READY: 'Sandra ready',
      FAILED: 'Sandra setup failed',
    },
  },
  {
    id: 'kira',
    label: 'Insights Agent',
    icon: <Brain className="w-5 h-5" />,
    description: {
      PENDING: 'Waiting for deployment...',
      CREATING: 'Creating Kira agent...',
      VERIFYING: 'Verifying Kira...',
      WAITING: 'Waiting for Kira...',
      READY: 'Kira ready',
      FAILED: 'Kira setup failed',
    },
  },
  {
    id: 'webhooks',
    label: 'Webhooks',
    icon: <Webhook className="w-5 h-5" />,
    description: {
      PENDING: 'Waiting for agents...',
      CREATING: 'Registering webhooks...',
      VERIFYING: 'Verifying webhooks...',
      WAITING: 'Waiting for webhook verification...',
      READY: 'Webhooks configured',
      FAILED: 'Webhook setup failed',
    },
  },
];

/* ============================================================================
 * HELPERS
 * ==========================================================================*/

function getServiceState(status: ProvisionStatus, serviceId: ServiceName): ServiceState {
  const stateKey = serviceId === 'supabase-config'
    ? 'supabase-config_state'
    : `${serviceId}_state` as keyof ProvisionStatus;
  return (status[stateKey] as ServiceState) || 'PENDING';
}

function getStateColor(state: ServiceState): string {
  switch (state) {
    case 'READY': return 'bg-emerald-500';
    case 'CREATING':
    case 'VERIFYING': return 'bg-blue-500';
    case 'WAITING': return 'bg-amber-500';
    case 'FAILED': return 'bg-red-500';
    default: return 'bg-slate-600';
  }
}

function getStateTextColor(state: ServiceState): string {
  switch (state) {
    case 'READY': return 'text-emerald-400';
    case 'CREATING':
    case 'VERIFYING': return 'text-blue-400';
    case 'WAITING': return 'text-amber-400';
    case 'FAILED': return 'text-red-400';
    default: return 'text-slate-500';
  }
}

function getStateProgress(state: ServiceState): number {
  switch (state) {
    case 'READY': return 100;
    case 'VERIFYING': return 75;
    case 'WAITING': return 60;
    case 'CREATING': return 30;
    case 'FAILED': return 100;
    default: return 0;
  }
}

function getOverallProgress(status: ProvisionStatus): number {
  const weights: Record<ServiceName, number> = {
    supabase: 15,
    github: 10,
    vercel: 25,
    'supabase-config': 5,
    sandra: 15,
    kira: 15,
    webhooks: 15,
  };

  let totalProgress = 0;
  let totalWeight = 0;

  for (const service of SERVICES) {
    const state = getServiceState(status, service.id);
    const weight = weights[service.id];
    totalWeight += weight;
    totalProgress += (getStateProgress(state) / 100) * weight;
  }

  return Math.round((totalProgress / totalWeight) * 100);
}

function countByState(status: ProvisionStatus): { ready: number; active: number; pending: number; failed: number } {
  let ready = 0, active = 0, pending = 0, failed = 0;

  for (const service of SERVICES) {
    const state = getServiceState(status, service.id);
    switch (state) {
      case 'READY': ready++; break;
      case 'CREATING':
      case 'VERIFYING':
      case 'WAITING': active++; break;
      case 'FAILED': failed++; break;
      default: pending++; break;
    }
  }

  return { ready, active, pending, failed };
}

/* ============================================================================
 * SERVICE ROW COMPONENT
 * ==========================================================================*/

function ServiceRow({ service, state }: { service: ServiceConfig; state: ServiceState }) {
  const isActive = state === 'CREATING' || state === 'VERIFYING' || state === 'WAITING';
  const progress = getStateProgress(state);

  return (
    <div className="flex items-center gap-4 py-3 border-b border-slate-800 last:border-0">
      {/* Icon */}
      <div className={`p-2 rounded-lg ${
        state === 'READY' ? 'bg-emerald-500/20 text-emerald-400' :
        state === 'FAILED' ? 'bg-red-500/20 text-red-400' :
        isActive ? 'bg-blue-500/20 text-blue-400' :
        'bg-slate-700/50 text-slate-500'
      }`}>
        {state === 'READY' ? <CheckCircle2 className="w-5 h-5" /> :
         state === 'FAILED' ? <XCircle className="w-5 h-5" /> :
         isActive ? <Loader2 className="w-5 h-5 animate-spin" /> :
         service.icon}
      </div>

      {/* Label & Description */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-white">{service.label}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            state === 'READY' ? 'bg-emerald-500/20 text-emerald-400' :
            state === 'FAILED' ? 'bg-red-500/20 text-red-400' :
            isActive ? 'bg-blue-500/20 text-blue-400' :
            'bg-slate-700 text-slate-400'
          }`}>
            {state}
          </span>
        </div>
        <p className="text-sm text-slate-400 truncate">{service.description[state]}</p>
      </div>

      {/* Progress Bar */}
      <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${getStateColor(state)}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
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

  if (!status) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  const isComplete = status.status === 'complete';
  const isFailed = status.status === 'failed';
  const overallProgress = getOverallProgress(status);
  const counts = countByState(status);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8">
      <div className="bg-slate-900 rounded-2xl p-8 max-w-2xl w-full">

        {/* HEADER */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white">
            {isComplete ? '🎉 Platform Ready!' : isFailed ? '❌ Setup Failed' : 'Building Your Platform'}
          </h1>
          <p className="text-slate-400 mt-1">
            {status.metadata?.platform_name || projectSlug}
          </p>
        </div>

        {/* OVERALL PROGRESS */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <div className="flex items-center gap-4 text-slate-400">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {formatTime(elapsed)}
              </span>
              <span>{counts.ready}/{SERVICES.length} complete</span>
            </div>
            <span className="text-white font-medium">{overallProgress}%</span>
          </div>
          <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-700 ease-out ${
                isFailed ? 'bg-red-500' : 
                isComplete ? 'bg-emerald-500' : 
                'bg-gradient-to-r from-purple-500 to-blue-500'
              }`}
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>

        {/* STATUS SUMMARY */}
        {!isComplete && !isFailed && (
          <div className="flex gap-4 mb-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-slate-400">{counts.ready} Ready</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-slate-400">{counts.active} Active</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-slate-600" />
              <span className="text-slate-400">{counts.pending} Pending</span>
            </div>
            {counts.failed > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-slate-400">{counts.failed} Failed</span>
              </div>
            )}
          </div>
        )}

        {/* SERVICE LIST */}
        <div className="bg-slate-800/50 rounded-xl p-4 mb-6">
          {SERVICES.map(service => (
            <ServiceRow
              key={service.id}
              service={service}
              state={getServiceState(status, service.id)}
            />
          ))}
        </div>

        {/* EXPECTATION SETTING */}
        {!isComplete && !isFailed && (
          <div className="mb-6 bg-slate-800/60 border border-slate-700 rounded-lg p-4 text-sm text-slate-300">
            <p className="mb-2">
              Services run in parallel where possible. Database and Repository start immediately,
              while Deployment waits for both to complete.
            </p>
            <p className="text-slate-400">
              <strong>Typical setup time:</strong> 5–15 minutes depending on external services.
            </p>
          </div>
        )}

        {/* ACTION BUTTONS */}
        {isComplete && status.metadata?.vercel_url && (
          <button
            onClick={() => window.location.href = `${status.metadata!.vercel_url}/create`}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <Sparkles className="w-5 h-5" />
            Go to Your Platform
            <ExternalLink className="w-5 h-5" />
          </button>
        )}

        {isFailed && (
          <div className="space-y-3">
            <button
              onClick={() => router.push('/factory')}
              className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              Back to Factory
            </button>
            <p className="text-center text-sm text-slate-500">
              Check the failed service above for details
            </p>
          </div>
        )}

      </div>
    </div>
  );
}