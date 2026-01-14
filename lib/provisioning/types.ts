// lib/provisioning/types.ts

import { ProvisionState } from './states';

export interface ProvisionContext {
  projectSlug: string;
  publicBaseUrl: string;
  supabaseToken: string;
  supabaseOrgId: string;
  metadata: Record<string, any>;
}

export interface ProvisionStepResult {
  nextState?: ProvisionState;
  metadata?: Record<string, any>;
}
