// lib/provisioning/types.ts

import { ProvisionState } from './states';

/**
 * Provisioning Context
 * --------------------
 * All inputs and accumulated outputs for a provisioning run.
 */
export interface ProvisionContext {
  // Identifiers
  projectSlug: string;
  platformName: string;
  companyName: string;
  
  // URLs
  publicBaseUrl: string;
  parentWebhookUrl: string;
  
  // Supabase credentials
  supabaseToken: string;
  supabaseOrgId: string;
  
  // GitHub credentials
  githubToken: string;
  githubOwner: string;
  
  // Vercel credentials
  vercelToken: string;
  vercelTeamId?: string;
  
  // ElevenLabs credentials
  elevenLabsApiKey: string;
  elevenLabsWebhookSecret?: string;
  
  // Theming
  colors: {
    primary: string;
    accent: string;
    background: string;
  };
  
  // Accumulated metadata
  metadata: ProvisionMetadata;
}

export interface ProvisionMetadata {
  // Supabase
  supabaseProjectRef?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  supabaseServiceKey?: string;
  supabaseAuthConfigured?: boolean;
  
  // GitHub
  githubRepoName?: string;
  githubRepoUrl?: string;
  
  // Vercel
  vercelProjectId?: string;
  vercelUrl?: string;
  vercelDeploymentId?: string;
  vercelEnvUpdated?: boolean;
  
  // ElevenLabs
  elevenLabsAgentId?: string;
  elevenLabsAgentName?: string;
  elevenLabsToolUrl?: string;
  elevenLabsRouterUrl?: string;
  
  // Webhook
  webhookRegistered?: boolean;
  
  // Error tracking
  lastError?: string;
  retryCount?: number;
  
  // Cleanup tracking
  cleanupCompleted?: boolean;
  cleanupDeleted?: string[];
  cleanupErrors?: string[];
}

export interface ProvisionStepResult {
  nextState?: ProvisionState;
  metadata?: ProvisionMetadata;
  error?: string;
}

export interface ProvisionRun {
  id: string;
  project_slug: string;
  platform_name: string;
  company_name: string;
  state: ProvisionState;
  metadata: ProvisionMetadata;
  error?: string;
  created_at: string;
  updated_at: string;
}

