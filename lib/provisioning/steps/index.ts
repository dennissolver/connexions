// lib/provisioning/steps/index.ts

import { ProvisionState } from '../states';
import { ProvisionContext, ProvisionStepResult } from '../types';

// Import step functions (matching actual export names)
import { createSupabaseProject } from './supabase';
import { createGithubRepo } from './github';
import { createVercelProject, triggerVercelDeployment } from './vercel';
import { createSandraAgent, createKiraAgent } from './elevenlabs';
import { registerWebhook } from './webhook';

export const STEPS: Partial<Record<ProvisionState, (ctx: ProvisionContext) => Promise<ProvisionStepResult>>> = {
  SUPABASE_CREATING: createSupabaseProject,
  GITHUB_CREATING: createGithubRepo,
  VERCEL_CREATING: createVercelProject,
  VERCEL_DEPLOYING: triggerVercelDeployment,
  SANDRA_CREATING: createSandraAgent,
  KIRA_CREATING: createKiraAgent,
  WEBHOOK_REGISTERING: registerWebhook,
};

export function isTerminalState(state: ProvisionState): boolean {
  return state === 'COMPLETE' || state === 'FAILED';
}

export { createSupabaseProject } from './supabase';
export { createGithubRepo } from './github';
export { createVercelProject, triggerVercelDeployment } from './vercel';
export { createSandraAgent, createKiraAgent, verifyAgentExists } from './elevenlabs';
export { registerWebhook } from './webhook';
