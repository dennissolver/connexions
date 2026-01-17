import { ExecutableState } from './states';
import { ProvisionContext, ProvisionStepResult } from './types';

type StepHandler = (ctx: ProvisionContext) => Promise<ProvisionStepResult>;

export const STEPS: Record<ExecutableState, StepHandler> = {
  SUPABASE_CREATING: async () => ({ nextState: 'SUPABASE_READY', metadata: {} }),
  GITHUB_CREATING: async () => ({ nextState: 'GITHUB_READY', metadata: {} }),
  VERCEL_CREATING: async () => ({ nextState: 'VERCEL_READY', metadata: {} }),
  SANDRA_CREATING: async () => ({ nextState: 'SANDRA_READY', metadata: {} }),
  KIRA_CREATING: async () => ({ nextState: 'KIRA_READY', metadata: {} }),
  WEBHOOK_REGISTERING: async () => ({ nextState: 'COMPLETE', metadata: {} }),
};
