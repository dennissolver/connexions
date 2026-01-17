// lib/provisioning/types.ts

import { ProvisionState } from './states';

/**
 * Context passed to each provisioning step
 */
export interface ProvisionContext {
  projectSlug: string;
  platformName: string;
  state: ProvisionState;
  metadata: ProvisionMetadata;
  
  // API credentials (loaded from env/secure storage)
  supabaseAccessToken: string;
  githubToken: string;
  vercelToken: string;
  elevenLabsApiKey: string;
  
  // URLs
  publicBaseUrl: string;
}

/**
 * Metadata accumulated during provisioning
 */
export interface ProvisionMetadata {
  // Supabase
  supabaseProjectRef?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  supabaseServiceKey?: string;
  
  // GitHub
  githubRepoUrl?: string;
  githubRepoName?: string;
  githubRepoOwner?: string;
  
  // Vercel
  vercelProjectId?: string;
  vercelUrl?: string;
  vercelDeploymentId?: string;
  vercelDeploymentUrl?: string;
  
  // Sandra (Setup Agent)
  sandraAgentId?: string;
  sandraAgentName?: string;
  sandraToolId?: string;
  sandraToolUrl?: string;
  sandraVerified?: boolean;
  
  // Kira (Insights Agent)
  kiraAgentId?: string;
  kiraAgentName?: string;
  kiraToolIds?: string[];
  kiraVerified?: boolean;
  
  // Legacy compatibility fields
  elevenLabsAgentId?: string;      // Alias for sandraAgentId
  setupAgentId?: string;           // Alias for sandraAgentId
  insightsAgentId?: string;        // Alias for kiraAgentId
  elevenLabsRouterUrl?: string;
  
  // Webhooks
  webhooksRegistered?: boolean;
  parentWebhookUrl?: string;
  
  // Error tracking
  error?: string;
  errorState?: string;
  errorTimestamp?: string;
  
  // Allow additional fields
  [key: string]: any;
}

/**
 * Result from a provisioning step
 */
export interface ProvisionStepResult {
  nextState: ProvisionState;
  metadata: ProvisionMetadata;
}

/**
 * Database record for a provisioning run
 */
export interface ProvisionRun {
  id: string;
  project_slug: string;
  platform_name?: string;
  state: string;
  metadata: ProvisionMetadata;
  started_at?: string;
  completed_at?: string;
  failed_at?: string;
  error?: string;
  created_at: string;
  updated_at: string;
}

/**
 * API response for provision status
 */
export interface ProvisionStatusResponse {
  state: ProvisionState;
  metadata?: ProvisionMetadata;
  platform_name?: string;
  started_at?: string;
  completed_at?: string;
  error?: string;
}

/**
 * Webhook event from child platform
 */
export interface ChildWebhookEvent {
  type: 'interview.completed' | 'interview.started' | 'panel.created' | 'panel.updated';
  platformId: string;
  projectSlug: string;
  timestamp: string;
  payload: Record<string, any>;
}

/**
 * Agent configuration for ElevenLabs
 */
export interface AgentConfig {
  name: string;
  prompt: string;
  firstMessage: string;
  voiceId: string;
  tools?: AgentTool[];
  webhookUrl?: string;
}

/**
 * Tool configuration for ElevenLabs agents
 */
export interface AgentTool {
  name: string;
  description: string;
  url: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
      items?: { type: string };
    }>;
    required?: string[];
  };
}
