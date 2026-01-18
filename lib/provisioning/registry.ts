// lib/provisioning/registry.ts
// Dependency graph and handler routing for parallel execution

import {
  ServiceName,
  ServiceState,
  ServiceStates,
  ProvisionContext,
  StepResult,
  ExecuteHandler,
  VerifyHandler,
} from './types';

// Service handlers
import { supabaseExecute } from './supabase/execute';
import { supabaseVerify } from './supabase/verify';
import { supabaseConfigExecute, supabaseConfigVerify } from './supabase/config';
import { githubExecute } from './github/execute';
import { githubVerify } from './github/verify';
import { vercelExecute } from './vercel/execute';
import { vercelVerify } from './vercel/verify';
import { sandraExecute } from './elevenlabs/sandra.execute';
import { sandraVerify } from './elevenlabs/sandra.verify';
import { kiraExecute } from './elevenlabs/kira.execute';
import { kiraVerify } from './elevenlabs/kira.verify';
import { webhooksExecute } from './webhooks/execute';
import { webhooksVerify } from './webhooks/verify';
import { finalizeExecute, finalizeVerify } from './finalize/execute';

// =============================================================================
// DEPENDENCY GRAPH
// =============================================================================

// Which services must be READY before this service can proceed?
// All services start at the same time, but wait on their dependencies
export const DEPENDENCIES: Record<ServiceName, ServiceName[]> = {
  supabase: [],                              // No dependencies - starts immediately
  github: ['supabase'],                                // No dependencies - starts immediately
  vercel: ['github', 'supabase'],            // Needs GitHub repo + Supabase keys
  'supabase-config': ['vercel', 'supabase'], // Needs Vercel URL to configure Supabase auth
  sandra: ['vercel', 'supabase'],            // Needs Vercel URL + Supabase ready
  kira: ['vercel', 'supabase'],              // Needs Vercel URL + Supabase ready
  webhooks: ['sandra', 'kira', 'vercel', 'supabase-config'], // Needs agents ready
  finalize: ['sandra', 'kira', 'webhooks'],  // Runs last - adds agent IDs to Vercel env
};

// =============================================================================
// HANDLER REGISTRY
// =============================================================================

export const EXECUTE_HANDLERS: Record<ServiceName, ExecuteHandler> = {
  supabase: supabaseExecute,
  github: githubExecute,
  vercel: vercelExecute,
  'supabase-config': supabaseConfigExecute,
  sandra: sandraExecute,
  kira: kiraExecute,
  webhooks: webhooksExecute,
  finalize: finalizeExecute,
};

export const VERIFY_HANDLERS: Record<ServiceName, VerifyHandler> = {
  supabase: supabaseVerify,
  github: githubVerify,
  vercel: vercelVerify,
  'supabase-config': supabaseConfigVerify,
  sandra: sandraVerify,
  kira: kiraVerify,
  webhooks: webhooksVerify,
  finalize: finalizeVerify,
};

// =============================================================================
// DEPENDENCY CHECKS
// =============================================================================

export function areDependenciesReady(
  service: ServiceName,
  services: ServiceStates
): boolean {
  const deps = DEPENDENCIES[service];
  if (!deps) return true;
  return deps.every(dep => services[dep] === 'READY');
}

export function getBlockingDependencies(
  service: ServiceName,
  services: ServiceStates
): ServiceName[] {
  const deps = DEPENDENCIES[service];
  if (!deps) return [];
  return deps.filter(dep => services[dep] !== 'READY');
}

// =============================================================================
// UI METADATA
// =============================================================================

export interface ServiceUiMeta {
  title: string;
  description: Record<ServiceState, string>;
  order: number;
}

export const SERVICE_UI: Record<ServiceName, ServiceUiMeta> = {
  supabase: {
    title: 'Database',
    order: 1,
    description: {
      PENDING: 'Waiting to start...',
      CREATING: 'Creating Supabase project...',
      VERIFYING: 'Verifying database...',
      WAITING: 'Waiting for database...',
      READY: 'Database ready',
      FAILED: 'Database setup failed',
    },
  },
  github: {
    title: 'Repository',
    order: 2,
    description: {
      PENDING: 'Waiting to start...',
      CREATING: 'Creating GitHub repository...',
      VERIFYING: 'Verifying repository...',
      WAITING: 'Waiting for repository...',
      READY: 'Repository ready',
      FAILED: 'Repository setup failed',
    },
  },
  vercel: {
    title: 'Deployment',
    order: 3,
    description: {
      PENDING: 'Waiting for repository and database...',
      CREATING: 'Creating Vercel project...',
      VERIFYING: 'Verifying deployment...',
      WAITING: 'Waiting for deployment...',
      READY: 'Deployment ready',
      FAILED: 'Deployment failed',
    },
  },
  'supabase-config': {
    title: 'Auth Config',
    order: 4,
    description: {
      PENDING: 'Waiting for deployment...',
      CREATING: 'Configuring auth URLs...',
      VERIFYING: 'Verifying configuration...',
      WAITING: 'Waiting for configuration...',
      READY: 'Auth configured',
      FAILED: 'Auth config failed',
    },
  },
  sandra: {
    title: 'Setup Agent',
    order: 5,
    description: {
      PENDING: 'Waiting for deployment...',
      CREATING: 'Creating Sandra agent...',
      VERIFYING: 'Verifying Sandra...',
      WAITING: 'Waiting for Sandra...',
      READY: 'Sandra ready',
      FAILED: 'Sandra setup failed',
    },
  },
  kira: {
    title: 'Insights Agent',
    order: 6,
    description: {
      PENDING: 'Waiting for deployment...',
      CREATING: 'Creating Kira agent...',
      VERIFYING: 'Verifying Kira...',
      WAITING: 'Waiting for Kira...',
      READY: 'Kira ready',
      FAILED: 'Kira setup failed',
    },
  },
  webhooks: {
    title: 'Webhooks',
    order: 7,
    description: {
      PENDING: 'Waiting for agents...',
      CREATING: 'Registering webhooks...',
      VERIFYING: 'Verifying webhooks...',
      WAITING: 'Waiting for webhook verification...',
      READY: 'Webhooks configured',
      FAILED: 'Webhook setup failed',
    },
  },
  finalize: {
    title: 'Finalize',
    order: 8,
    description: {
      PENDING: 'Waiting for all services...',
      CREATING: 'Configuring platform...',
      VERIFYING: 'Verifying final deployment...',
      WAITING: 'Waiting for redeploy...',
      READY: 'Platform ready!',
      FAILED: 'Finalization failed',
    },
  },
};

export function getServiceUiMeta(service: ServiceName, state: ServiceState): { title: string; description: string; order: number } {
  const meta = SERVICE_UI[service];
  if (!meta) {
    return { title: service, description: state, order: 99 };
  }
  return {
    title: meta.title,
    description: meta.description[state],
    order: meta.order,
  };
}

export function calculateOverallProgress(services: ServiceStates): number {
  const weights: Record<ServiceName, number> = {
    supabase: 12,
    github: 8,
    vercel: 20,
    'supabase-config': 5,
    sandra: 15,
    kira: 15,
    webhooks: 10,
    finalize: 15,
  };

  let progress = 0;
  for (const [service, state] of Object.entries(services) as [ServiceName, ServiceState][]) {
    const weight = weights[service] || 0;
    if (state === 'READY') {
      progress += weight;
    } else if (state === 'VERIFYING' || state === 'WAITING') {
      progress += weight * 0.7;
    } else if (state === 'CREATING') {
      progress += weight * 0.3;
    }
  }

  return Math.round(progress);
}