// lib/provisioning/registry.ts

import { ProvisionContext, ProvisionStepResult } from './types';
import { ProvisionState } from './states';

// Step implementations
import { createSupabaseProject } from './steps/supabase';
import { createGithubRepo } from './steps/github';
import { createVercelProject } from './steps/vercel';
import { createSandraAgent, createKiraAgent } from './steps/elevenlabs';
import { registerWebhooks } from './steps/webhook';

/* ============================================================================
 * EXECUTION REGISTRY
 * ============================================================================
 *
 * This is the ONLY place where:
 * - executable states are defined
 * - which function runs for each state
 * - what "success" means (via returned nextState)
 *
 * Engine/orchestrator must NEVER switch on state.
 */

export type ExecutableState =
  | 'SUPABASE_CREATING'
  | 'GITHUB_CREATING'
  | 'VERCEL_CREATING'
  | 'SANDRA_CREATING'
  | 'KIRA_CREATING'
  | 'WEBHOOK_REGISTERING';

type StepExecutor = (ctx: ProvisionContext) => Promise<ProvisionStepResult>;

export const EXECUTION_REGISTRY: Record<ExecutableState, StepExecutor> = {
  SUPABASE_CREATING: async (ctx) => {
    return createSupabaseProject(ctx);
  },

  GITHUB_CREATING: async (ctx) => {
    return createGithubRepo(ctx);
  },

  VERCEL_CREATING: async (ctx) => {
    return createVercelProject(ctx);
  },

  SANDRA_CREATING: async (ctx) => {
    return createSandraAgent(ctx);
  },

  KIRA_CREATING: async (ctx) => {
    return createKiraAgent(ctx);
  },

  WEBHOOK_REGISTERING: async (ctx) => {
    return registerWebhooks(ctx);
  },
};

/* ============================================================================
 * EXECUTABILITY GUARD
 * ============================================================================
 *
 * Prevents accidental execution of terminal or unknown states.
 */

export function isExecutableState(
  state: ProvisionState
): state is ExecutableState {
  return state in EXECUTION_REGISTRY;
}

/* ============================================================================
 * UI REGISTRY (SINGLE SOURCE FOR FRONTEND)
 * ============================================================================
 *
 * Frontend MUST read from this, never redefine states.
 */

export const PROVISION_UI: Record<
  ProvisionState,
  {
    title: string;
    description: string;
    weight: number; // progress weighting
  }
> = {
  SUPABASE_CREATING: {
    title: 'Database',
    description: 'Creating Supabase project and authentication',
    weight: 10,
  },
  SUPABASE_READY: {
    title: 'Database',
    description: 'Database ready',
    weight: 10,
  },

  GITHUB_CREATING: {
    title: 'Repository',
    description: 'Creating GitHub repository',
    weight: 15,
  },
  GITHUB_READY: {
    title: 'Repository',
    description: 'Repository ready',
    weight: 15,
  },

  VERCEL_CREATING: {
    title: 'Deployment',
    description: 'Creating Vercel project',
    weight: 20,
  },
  VERCEL_READY: {
    title: 'Deployment',
    description: 'Deployment ready',
    weight: 20,
  },

  SANDRA_CREATING: {
    title: 'Setup Agent',
    description: 'Creating Sandra setup agent',
    weight: 15,
  },
  SANDRA_READY: {
    title: 'Setup Agent',
    description: 'Sandra ready',
    weight: 15,
  },

  KIRA_CREATING: {
    title: 'Insights Agent',
    description: 'Creating Kira insights agent',
    weight: 10,
  },
  KIRA_READY: {
    title: 'Insights Agent',
    description: 'Kira ready',
    weight: 10,
  },

  WEBHOOK_REGISTERING: {
    title: 'Finalisation',
    description: 'Registering platform webhooks',
    weight: 5,
  },

  COMPLETE: {
    title: 'Complete',
    description: 'Platform ready',
    weight: 100,
  },

  FAILED: {
    title: 'Failed',
    description: 'Provisioning failed',
    weight: 100,
  },
};

/* ============================================================================
 * PROGRESS CALCULATION
 * ============================================================================
 *
 * Deterministic, registry-driven progress.
 */

export function calculateProgress(state: ProvisionState): number {
  let total = 0;
  let achieved = 0;

  for (const [s, meta] of Object.entries(PROVISION_UI)) {
    total += meta.weight;
    if (s === state) {
      achieved += meta.weight;
      break;
    }
    achieved += meta.weight;
  }

  return Math.min(100, Math.round((achieved / total) * 100));
}
