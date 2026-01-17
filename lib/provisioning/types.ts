// lib/provisioning/types.ts
import { ProvisionState } from './states';

export interface ProvisionContext {
  projectSlug: string;
  platformName: string;
  companyName: string;
  metadata: ProvisionMetadata;
  publicBaseUrl: string;
  parentWebhookUrl: string;
  supabaseToken: string;
  supabaseOrgId: string;
  githubToken: string;
  githubOwner: string;
  vercelToken: string;
  vercelTeamId?: string;
  elevenLabsApiKey: string;
  elevenLabsWebhookSecret?: string;
  colors: {
    primary: string;
    accent: string;
    background: string;
  };
}

export interface ProvisionMetadata {
  supabaseProjectRef?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  supabaseServiceKey?: string;
  githubRepoUrl?: string;
  githubRepoName?: string;
  githubRepoOwner?: string;
  vercelProjectId?: string;
  vercelUrl?: string;
  vercelDeploymentId?: string;
  vercelDeploymentUrl?: string;
  sandraAgentId?: string;
  sandraAgentName?: string;
  sandraToolId?: string;
  sandraToolUrl?: string;
  sandraVerified?: boolean;
  kiraAgentId?: string;
  kiraAgentName?: string;
  kiraToolIds?: string[];
  kiraVerified?: boolean;
  elevenLabsAgentId?: string;
  setupAgentId?: string;
  insightsAgentId?: string;
  elevenLabsRouterUrl?: string;
  webhooksRegistered?: boolean;
  parentWebhookUrl?: string;
  error?: string;
  errorState?: string;
  errorTimestamp?: string;
  [key: string]: any;
}

export interface ProvisionStepResult {
  nextState: ProvisionState;
  metadata: ProvisionMetadata;
}

export interface ProvisionRun {
  id: string;
  project_slug: string;
  platform_name?: string;
  company_name?: string;
  state: string;
  metadata: ProvisionMetadata;
  started_at?: string;
  completed_at?: string;
  failed_at?: string;
  error?: string;
  created_at: string;
  updated_at: string;
}
