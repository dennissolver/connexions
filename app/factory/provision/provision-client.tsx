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
  Trash2,
} from 'lucide-react';

/* ============================================================================
 * TYPES
 * ==========================================================================*/

type ServiceState = 'PENDING' | 'CREATING' | 'VERIFYING' | 'WAITING' | 'READY' | 'FAILED';
type CleanupState = 'NOT_NEEDED' | 'CLEANING' | 'CLEANED' | 'FAILED';

type ServiceName =
  | 'cleanup'
  | 'supabase'
  | 'github'
  | 'vercel'
  | 'supabase-config'
  | 'sandra'
  | 'kira'
  | 'webhooks'
  | 'finalize';

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
  finalize_state?: ServiceState;
  metadata?: {
    error?: string;
    vercel_url?: string;
    platform_name?: string;
    company_name?: string;
    cleanup_performed?: boolean;
    cleanup_result?: {
      deleted: Record<string, boolean>;
      errors: string[];
    };
  };
}

interface ServiceConfig {
  id: ServiceName;
  label: string;
  icon: React.ReactNode;
  description: Record<ServiceState | CleanupState, string>;
  isCleanup?: boolean;
}

/* ============================================================================
 * SERVICE CONFIG
 * ==========================================================================*/

const SERVICES: ServiceConfig[] = [
  {
    id: 'cleanup',
    label: 'Cleanup',
    icon: <Trash2 className="w-5 h-5" />,
    isCleanup: true,
    description: {
      NOT_NEEDED: 'No existing resources',
      CLEANING: 'Removing old resources...',
      CLEANED: 'Previous resources cleaned',
      FAILED: 'Cleanup failed',
      // Standard states (won't be used but TypeScript needs them)
      PENDING: 'Checking...',
      CREATING: 'Cleaning...',
      VERIFYING: 'Verifying...',
      WAITING: 'Waiting...',
      READY: 'Clean',
      // FAILED already defined above
    },
  },
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
      NOT_NEEDED: '',
      CLEANING: '',
      CLEANED: '',
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
      NOT_NEEDED: '',
      CLEANING: '',
      CLEANED: '',
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
      NOT_NEEDED: '',
      CLEANING: '',
      CLEANED: '',
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
      NOT_NEEDED: '',
      CLEANING: '',
      CLEANED: '',
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
      NOT_NEEDED: '',
      CLEANING: '',
      CLEANED: '',
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
      NOT_NEEDED: '',
      CLEANING: '',
      CLEANED: '',
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
      NOT_NEEDED: '',
      CLEANING: '',
      CLEANED: '',
    },
  },
  {
    id: 'finalize',
    label: 'Finalize',
    icon: <Sparkles className="w-5 h-5" />,
    description: {
      PENDING: 'Waiting for all services...',
      CREATING: 'Configuring platform...',
      VERIFYING: 'Verifying final deployment...',
      WAITING: 'Waiting for redeploy...',
      READY: 'Platform ready!',
      FAILED: 'Finalization failed',
      NOT_NEEDED: '',
      CLEANING: '',
      CLEANED: '',
    },
  },
];

/* ============================================================================
 * HELPERS
 * ==========================================================================*/

function getServiceState(status: ProvisionStatus, serviceId: ServiceName): ServiceState | CleanupState {
  // Special handling for cleanup
  if (serviceId === 'cleanup') {
    const cleanupPerformed = status.metadata?.cleanup_performed;
    const cleanupResult = status.metadata?.cleanup_result;

    if (cleanupPerformed === undefined) {
      // Still determining
      return 'CLEANING';
    }
    if (cleanupPerformed === false) {
      return 'NOT_NEEDED';
    }
    if (cleanupResult?.errors && cleanupResult.errors.length > 0) {
      return 'FAILED';
    }
    return 'CLEANED';
  }

  // Handle hyphenated service names
  let stateKey: string;
  if (serviceId === 'supabase-config') {
    stateKey = 'supabase-config_state';
  } else if (serviceId === 'finalize') {
    stateKey = 'finalize_state';
  } else {
    stateKey = `${serviceId}_state`;
  }

  return (status[stateKey as keyof ProvisionStatus] as ServiceState) || 'PENDING';
}

function getStateColor(state: ServiceState | CleanupState): string {
  switch (state) {
    case 'READY':
    case 'CLEANED':
    case 'NOT_NEEDED':
      return 'bg-emerald-500';
    case 'CREATING':
    case 'VERIFYING':
    case 'CLEANING':
      return 'bg-blue-500';
    case 'WAITING':
      return 'bg-amber-500';
    case 'FAILED':
      return 'bg-red-500';
    default:
      return 'bg-slate-600';
  }
}

function getStateBgColor(state: ServiceState | CleanupState): string {
  switch (state) {
    case 'READY':
    case 'CLEANED':
    case 'NOT_NEEDED':
      return 'bg-emerald-500/20 text-emerald-400';
    case 'CREATING':
    case 'VERIFYING':
    case 'CLEANING':
      return 'bg-blue-500/20 text-blue-400';
    case 'WAITING':
      return 'bg-amber-500/20 text-amber-400';
    case 'FAILED':
      return 'bg-red-500/20 text-red-400';
    default:
      return 'bg-slate-700/50 text-slate-500';
  }
}

function getStateProgress(state: ServiceState | CleanupState): number {
  switch (state) {
    case 'READY':
    case 'CLEANED':
    case 'NOT_NEEDED':
      return 100;
    case 'VERIFYING':
      return 75;
    case 'WAITING':
      return 60;
    case 'CREATING':
    case 'CLEANING':
      return 30;
    case 'FAILED':
      return 100;
    default:
      return 0;
  }
}

function isActiveState(state: ServiceState | CleanupState): boolean {
  return state === 'CREATING' || state === 'VERIFYING' || state === 'WAITING' || state === 'CLEANING';
}

function isCompleteState(state: ServiceState | CleanupState): boolean {
  return state === 'READY' || state === 'CLEANED' || state === 'NOT_NEEDED';
}

function getOverallProgress(status: ProvisionStatus): number {
  const weights: Record<ServiceName, number> = {
    cleanup: 5,
    supabase: 12,
    github: 8,
    vercel: 18,
    'supabase-config': 5,
    sandra: 12,
    kira: 12,
    webhooks: 10,
    finalize: 18,
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
    if (isCompleteState(state)) {
      ready++;
    } else if (isActiveState(state)) {
      active++;
    } else if (state === 'FAILED') {
      failed++;
    } else {
      pending++;
    }
  }

  return { ready, active, pending, failed };
}

function getDisplayState(state: ServiceState | CleanupState): string {
  switch (state) {
    case 'NOT_NEEDED': return 'SKIPPED';
    case 'CLEANED': return 'DONE';
    case 'CLEANING': return 'CLEANING';
    default: return state;
  }
}

/* ============================================================================
 * SERVICE ROW COMPONENT
 * ==========================================================================*/

function ServiceRow({ service, state }: { service: ServiceConfig; state: ServiceState | CleanupState }) {
  const isActive = isActiveState(state);
  const isComplete = isCompleteState(state);
  const isFailed = state === 'FAILED';
  const progress = getStateProgress(state);

  return (
    <div className="flex items-center gap-4 py-3 border-b border-slate-800 last:border-0">
      {/* Icon */}
      <div className={`p-2 rounded-lg ${getStateBgColor(state)}`}>
        {isComplete ? <CheckCircle2 className="w-5 h-5" /> :
         isFailed ? <XCircle className="w-5 h-5" /> :
         isActive ? <Loader2 className="w-5 h-5 animate-spin" /> :
         service.icon}
      </div>

      {/* Label & Description */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-white">{service.label}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${getStateBgColor(state)}`}>
            {getDisplayState(state)}
          </span>
        </div>
        <p className="text-sm text-slate-400 truncate">
          {service.description[state] || service.description.PENDING}
        </p>
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
              <span className="text-slate-400">{counts.ready} Done</span>
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