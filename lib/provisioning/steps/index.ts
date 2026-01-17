// lib/provisioning/steps/index.ts

import { ProvisionState } from '../states';
import { ProvisionContext, ProvisionStepResult } from '../types';

// Import step functions
import { createSupabaseProject } from './supabase';
import { createGitHubRepo } from './github';
import { createVercelProject, triggerVercelDeployment } from './vercel';
import { createSandraAgent, createKiraAgent } from './elevenlabs';
import { registerWebhooks } from './webhook';

/**
 * Map of states to their handler functions
 * Used by orchestrator.ts to run the appropriate step
 */
export const STEPS: Partial<Record<ProvisionState, (ctx: ProvisionContext) => Promise<ProvisionStepResult>>> = {
  // Database
  SUPABASE_CREATING: createSupabaseProject,

  // Repository
  GITHUB_CREATING: createGitHubRepo,

  // Deployment
  VERCEL_CREATING: createVercelProject,
  VERCEL_DEPLOYING: triggerVercelDeployment,

  // Sandra (Setup Agent) - creates interview panels
  SANDRA_CREATING: createSandraAgent,

  // Kira (Insights Agent) - data exploration
  KIRA_CREATING: createKiraAgent,

  // Final webhook registration
  WEBHOOK_REGISTERING: registerWebhooks,
};

/**
 * Check if state is terminal (no more steps to run)
 */
export function isTerminalState(state: ProvisionState): boolean {
  return state === 'COMPLETE' || state === 'FAILED';
}

// Re-export individual functions for direct use if needed
export { createSupabaseProject } from './supabase';
export { createGitHubRepo } from './github';
export { createVercelProject, triggerVercelDeployment } from './vercel';
export { createSandraAgent, createKiraAgent, verifyAgentExists } from './elevenlabs';
export { registerWebhooks } from './webhook';