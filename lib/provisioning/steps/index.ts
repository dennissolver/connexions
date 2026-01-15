// lib/provisioning/steps/index.ts

import { ProvisionState } from '../states';
import { ProvisionContext, ProvisionStepResult } from '../types';

import { createSupabaseProject, waitForSupabaseReady } from './supabase';
import { createGithubRepo } from './github';
import { createVercelProject, triggerVercelDeployment } from './vercel';
import { createElevenLabsAgent } from './elevenlabs';
import { registerWebhook } from './webhook';
import { cleanup } from './cleanup';

type StepFn = (ctx: ProvisionContext) => Promise<ProvisionStepResult>;

export const STEPS: Record<ProvisionState, StepFn> = {
  INIT: createSupabaseProject,
  SUPABASE_CREATING: waitForSupabaseReady,
  SUPABASE_READY: createGithubRepo,
  GITHUB_CREATING: createGithubRepo,
  GITHUB_READY: createVercelProject,
  VERCEL_CREATING: triggerVercelDeployment,
  VERCEL_DEPLOYING: triggerVercelDeployment,
  VERCEL_READY: createElevenLabsAgent,
  ELEVENLABS_CREATING: createElevenLabsAgent,
  WEBHOOK_REGISTERING: registerWebhook,
  COMPLETE: async () => ({}),
  FAILED: cleanup,
};

export function isTerminalState(state: ProvisionState): boolean {
  return state === 'COMPLETE' || state === 'FAILED';
}