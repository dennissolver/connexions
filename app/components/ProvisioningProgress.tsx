'use client';

import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { ProvisionState } from '@/lib/provisioning/states';

/* ============================================================================
 * UI STATE MAP — MUST MATCH ProvisionState EXACTLY
 * ==========================================================================*/

const UI_MAP: Record<
  ProvisionState,
  { title: string; description: string }
> = {
  // Executable states
  SUPABASE_CREATING: {
    title: 'Database',
    description: 'Creating Supabase project',
  },
  GITHUB_CREATING: {
    title: 'Repository',
    description: 'Creating GitHub repository',
  },
  VERCEL_CREATING: {
    title: 'Deployment',
    description: 'Creating Vercel project',
  },
  SANDRA_CREATING: {
    title: 'Setup Agent',
    description: 'Creating Sandra',
  },
  KIRA_CREATING: {
    title: 'Insights Agent',
    description: 'Creating Kira',
  },
  WEBHOOK_REGISTERING: {
    title: 'Webhooks',
    description: 'Registering callbacks',
  },

  // Terminal states
  SUPABASE_READY: {
    title: 'Database',
    description: 'Database ready',
  },
  GITHUB_READY: {
    title: 'Repository',
    description: 'Repository ready',
  },
  VERCEL_READY: {
    title: 'Deployment',
    description: 'Deployment ready',
  },
  SANDRA_READY: {
    title: 'Setup Agent',
    description: 'Sandra ready',
  },
  KIRA_READY: {
    title: 'Insights Agent',
    description: 'Kira ready',
  },
  COMPLETE: {
    title: 'Complete',
    description: 'Platform is ready',
  },
  FAILED: {
    title: 'Failed',
    description: 'Provisioning failed',
  },
};

/* ============================================================================
 * COMPONENT
 * ==========================================================================*/

type Props = {
  state: ProvisionState;
};

export default function ProvisioningProgress({ state }: Props) {
  const ui =
    UI_MAP[state] ?? {
      title: 'Starting',
      description: 'Preparing provisioning workflow',
    };

  const isComplete = state === 'COMPLETE';
  const isFailed = state === 'FAILED';

  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-800 px-4 py-3">
      {/* STATUS ICON */}
      {isComplete ? (
        <CheckCircle2 className="h-5 w-5 text-green-500" />
      ) : isFailed ? (
        <XCircle className="h-5 w-5 text-red-500" />
      ) : (
        <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
      )}

      {/* TEXT */}
      <div className="flex flex-col">
        <span className="text-sm font-medium text-white">
          {ui.title}
        </span>
        <span className="text-xs text-slate-400">
          {ui.description}
        </span>
      </div>
    </div>
  );
}
