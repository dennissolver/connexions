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

// Service handlers - imported lazily to avoid circular deps
import { supabaseExecute } from './supabase/execute';
import { supabaseVerify } from './supabase/verify';
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

// =============================================================================
// DEPENDENCY GRAPH
// =============================================================================

// Which services must be READY before this service can proceed?
export const DEPENDENCIES: Record<ServiceName, ServiceName[]> = {
  supabase: [],                           // No dependencies - starts immediately
  github: [],                             // No dependencies - starts immediately
  vercel: ['github'],                     // Needs GitHub repo
  sandra: ['vercel', 'supabase'],         // Needs Vercel URL + Supabase for config
  kira: ['vercel', 'supabase'],           // Needs Vercel URL + Supabase for config
  webhooks: ['sandra', 'kira', 'vercel'], // Needs agents + deployment URL
};

// =============================================================================
// HANDLER REGISTRY
// =============================================================================

export const EXECUTE_HANDLERS: Record<ServiceName, ExecuteHandler> = {
  supabase: supabaseExecute,
  github: githubExecute,
  vercel: vercelExecute,
  sandra: sandraExecute,
  kira: kiraExecute,
  webhooks: webhooksExecute,
};

export const VERIFY_HANDLERS: Record<ServiceName, VerifyHandler> = {
  supabase: supabaseVerify,
  github: githubVerify,
  vercel: vercelVerify,
  sandra: sandraVerify,
  kira: kiraVerify,
  webhooks: webhooksVerify,
};

// =============================================================================
// DEPENDENCY CHECKS
// =============================================================================

export function areDependenciesReady(
  service: ServiceName,
  services: ServiceStates
): boolean {
  const deps = DEPENDENCIES[service];
  return deps.every(dep => services[dep] === 'READY');
}

export function getBlockingDependencies(
  service: ServiceName,
  services: ServiceStates
): ServiceName[] {
  const deps = DEPENDENCIES[service];
  return deps.filter(dep => services[dep] !== 'READY');
}

// =============================================================================
// UI METADATA
// =============================================================================

export interface ServiceUiMeta {
  title: string;
  description: Record<ServiceState, string>;
  order: number; // Display order
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
      PENDING: 'Waiting for repository...',
      CREATING: 'Creating Vercel project...',
      VERIFYING: 'Verifying deployment...',
      WAITING: 'Waiting for deployment...',
      READY: 'Deployment ready',
      FAILED: 'Deployment failed',
    },
  },
  sandra: {
    title: 'Setup Agent',
    order: 4,
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
    order: 5,
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
    order: 6,
    description: {
      PENDING: 'Waiting for agents...',
      CREATING: 'Registering webhooks...',
      VERIFYING: 'Verifying webhooks...',
      WAITING: 'Waiting for webhook verification...',
      READY: 'Webhooks configured',
      FAILED: 'Webhook setup failed',
    },
  },
};

export function getServiceUiMeta(service: ServiceName, state: ServiceState): { title: string; description: string; order: number } {
  const meta = SERVICE_UI[service];
  return {
    title: meta.title,
    description: meta.description[state],
    order: meta.order,
  };
}

export function calculateOverallProgress(services: ServiceStates): number {
  const weights: Record<ServiceName, number> = {
    supabase: 15,
    github: 15,
    vercel: 25,
    sandra: 15,
    kira: 15,
    webhooks: 15,
  };

  let progress = 0;
  for (const [service, state] of Object.entries(services) as [ServiceName, ServiceState][]) {
    if (state === 'READY') {
      progress += weights[service];
    } else if (state === 'VERIFYING' || state === 'WAITING') {
      progress += weights[service] * 0.7;
    } else if (state === 'CREATING') {
      progress += weights[service] * 0.3;
    }
  }

  return Math.round(progress);
}
