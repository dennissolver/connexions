import { ProvisionContext, ProvisionStepResult } from '../types';
import {
  isExecutableState,
  ExecutableState,
  ProvisionState,
} from '../states';

// Concrete step implementations
import { createSupabaseProject } from './supabase';
import { createGithubRepo } from './github';
import { createVercelProject } from './vercel';
import { createSandraAgent, createKiraAgent } from './elevenlabs';
import { registerWebhooks } from './webhook';

/* ============================================================================
 * EXECUTION (NO MAPS, NO INDEXING)
 * ==========================================================================*/

/**
 * Execute exactly one provisioning step.
 * This function is the ONLY place where execution routing exists.
 */
export async function executeProvisionStep(
  state: ExecutableState,
  ctx: ProvisionContext
): Promise<ProvisionStepResult> {
  switch (state) {
    case 'SUPABASE_CREATING':
      return createSupabaseProject(ctx);

    case 'GITHUB_CREATING':
      return createGithubRepo(ctx);

    case 'VERCEL_CREATING':
      return createVercelProject(ctx);

    case 'SANDRA_CREATING':
      return createSandraAgent(ctx);

    case 'KIRA_CREATING':
      return createKiraAgent(ctx);

    case 'WEBHOOK_REGISTERING':
      return registerWebhooks(ctx);

    default: {
      // This should be unreachable due to typing,
      // but we guard anyway for runtime safety.
      const exhaustive: never = state;
      throw new Error(`Unhandled executable state: ${exhaustive}`);
    }
  }
}

/* ============================================================================
 * UI METADATA (EXPLICIT, COMPLETE)
 * ==========================================================================*/

export type ProvisionUiMeta = {
  title: string;
  description: string;
  weight: number; // for progress calculation
};

export function getProvisionUiMeta(
  state: ProvisionState
): ProvisionUiMeta {
  switch (state) {
    case 'SUPABASE_CREATING':
      return {
        title: 'Database',
        description: 'Creating Supabase project',
        weight: 10,
      };

    case 'SUPABASE_READY':
      return {
        title: 'Database',
        description: 'Database ready',
        weight: 15,
      };

    case 'GITHUB_CREATING':
      return {
        title: 'Repository',
        description: 'Creating GitHub repository',
        weight: 30,
      };

    case 'GITHUB_READY':
      return {
        title: 'Repository',
        description: 'Repository ready',
        weight: 35,
      };

    case 'VERCEL_CREATING':
      return {
        title: 'Deployment',
        description: 'Creating Vercel project',
        weight: 55,
      };

    case 'VERCEL_READY':
      return {
        title: 'Deployment',
        description: 'Deployment ready',
        weight: 65,
      };

    case 'SANDRA_CREATING':
      return {
        title: 'Setup Agent',
        description: 'Creating Sandra setup agent',
        weight: 75,
      };

    case 'SANDRA_READY':
      return {
        title: 'Setup Agent',
        description: 'Sandra ready',
        weight: 80,
      };

    case 'KIRA_CREATING':
      return {
        title: 'Insights Agent',
        description: 'Creating Kira insights agent',
        weight: 85,
      };

    case 'KIRA_READY':
      return {
        title: 'Insights Agent',
        description: 'Kira ready',
        weight: 90,
      };

    case 'WEBHOOK_REGISTERING':
      return {
        title: 'Finalising',
        description: 'Registering webhooks',
        weight: 95,
      };

    case 'COMPLETE':
      return {
        title: 'Complete',
        description: 'Platform ready',
        weight: 100,
      };

    case 'FAILED':
      return {
        title: 'Failed',
        description: 'Provisioning failed',
        weight: 100,
      };

    default: {
      const exhaustive: never = state;
      throw new Error(`Unhandled UI state: ${exhaustive}`);
    }
  }
}

/* ============================================================================
 * PROGRESS (DERIVED, NOT DUPLICATED)
 * ==========================================================================*/

export function getProvisionProgress(
  state: ProvisionState
): number {
  return getProvisionUiMeta(state).weight;
}

/* ============================================================================
 * SAFETY HELPERS
 * ==========================================================================*/

/**
 * Guards execution at runtime.
 * Engine/orchestrator MUST call this before executeProvisionStep.
 */
export function assertExecutable(
  state: ProvisionState
): asserts state is ExecutableState {
  if (!isExecutableState(state)) {
    throw new Error(
      `State ${state} is not executable`
    );
  }
}
