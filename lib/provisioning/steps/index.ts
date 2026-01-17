// lib/provisioning/steps/index.ts

import { ProvisionState } from '../states';
import { ProvisionContext, ProvisionStepResult } from '../types';

// Import step functions (matching actual export names)
import { createSupabaseProject } from './supabase';
import { createGithubRepo } from './github';
import { createVercelProject, triggerVercelDeployment } from './vercel';
import { createSandraAgent, createKiraAgent } from './elevenlabs';
import { registerWebhook } from './webhook';

// Transition steps for _READY states
const transitionTo = (nextState: ProvisionState) => 
  async (ctx: ProvisionContext): Promise<ProvisionStepResult> => 
    ({ nextState, metadata: ctx.metadata });

export const STEPS: Partial<Record<ProvisionState, (ctx: ProvisionContext) => Promise<ProvisionStepResult>>> = {
  // Init
  INIT: transitionTo('SUPABASE_CREATING'),
  
  // Supabase
  SUPABASE_CREATING: createSupabaseProject,
  SUPABASE_READY: transitionTo('GITHUB_CREATING'),
  
  // GitHub
  GITHUB_CREATING: createGithubRepo,
  GITHUB_READY: transitionTo('VERCEL_CREATING'),
  
  // Vercel
  VERCEL_CREATING: createVercelProject,
  VERCEL_DEPLOYING: triggerVercelDeployment,
  VERCEL_READY: transitionTo('SANDRA_CREATING'),
  
  // Sandra
  SANDRA_CREATING: createSandraAgent,
  SANDRA_READY: transitionTo('KIRA_CREATING'),
  
  // Kira
  KIRA_CREATING: createKiraAgent,
  KIRA_READY: transitionTo('WEBHOOK_REGISTERING'),
  
  // Webhook
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
