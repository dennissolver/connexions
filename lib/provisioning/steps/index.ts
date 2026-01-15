// lib/provisioning/steps/index.ts

import { ProvisionState } from '../states';
import { ProvisionContext, ProvisionStepResult } from '../types';
import { createSupabaseProject, waitForSupabaseReady } from './supabase';
import { createGithubRepo } from './github';
import { createVercelProject, triggerVercelDeployment } from './vercel';
import { createElevenLabsAgent } from './elevenlabs';
import { registerWebhook } from './webhook';
import { verifySupabase, verifyGitHub, verifyVercel } from './verify';

export type StepFunction = (ctx: ProvisionContext) => Promise<ProvisionStepResult>;

// Map each state to its step function
export const STEPS: Partial<Record<ProvisionState, StepFunction>> = {
  // Step 1: Initialize and create Supabase project
  INIT: async (ctx) => {
    console.log(`[INIT] Starting provisioning for ${ctx.projectSlug}`);
    return createSupabaseProject(ctx);
  },

  // Step 2: Wait for Supabase to be ready, run migrations
  SUPABASE_CREATING: async (ctx) => {
    console.log(`[SUPABASE_CREATING] Waiting for Supabase project...`);
    const result = await waitForSupabaseReady(ctx);

    // If we're moving to SUPABASE_READY, verify first
    if (result.nextState === 'SUPABASE_READY') {
      const verification = await verifySupabase({ ...ctx, metadata: result.metadata || ctx.metadata });
      if (!verification.success) {
        console.error(`[SUPABASE_CREATING] Verification failed: ${verification.error}`);
        // Stay in SUPABASE_CREATING to retry
        return { nextState: 'SUPABASE_CREATING', metadata: result.metadata };
      }
      console.log(`[SUPABASE_CREATING] Verification passed`);
    }

    return result;
  },

  // Step 3: Create GitHub repository with template files
  SUPABASE_READY: async (ctx) => {
    console.log(`[SUPABASE_READY] Creating GitHub repository...`);
    return createGithubRepo(ctx);
  },

  // Step 4: GitHub ready, create Vercel project
  GITHUB_CREATING: async (ctx) => {
    console.log(`[GITHUB_CREATING] Waiting for GitHub...`);
    // GitHub creation is synchronous, so if we're here, check if done
    if (ctx.metadata.githubRepoName) {
      // Verify before advancing
      const verification = await verifyGitHub(ctx);
      if (!verification.success) {
        console.error(`[GITHUB_CREATING] Verification failed: ${verification.error}`);
        return { nextState: 'GITHUB_CREATING', metadata: ctx.metadata };
      }
      return { nextState: 'GITHUB_READY', metadata: ctx.metadata };
    }
    return createGithubRepo(ctx);
  },

  // Step 5: Create Vercel project linked to GitHub
  GITHUB_READY: async (ctx) => {
    console.log(`[GITHUB_READY] Creating Vercel project...`);
    return createVercelProject(ctx);
  },

  // Step 6: Vercel project created, wait for deployment
  VERCEL_CREATING: async (ctx) => {
    console.log(`[VERCEL_CREATING] Triggering deployment...`);
    return triggerVercelDeployment(ctx);
  },

  // Step 7: Wait for Vercel deployment to complete
  VERCEL_DEPLOYING: async (ctx) => {
    console.log(`[VERCEL_DEPLOYING] Waiting for deployment...`);
    const result = await triggerVercelDeployment(ctx);

    // If moving past VERCEL_DEPLOYING, verify deployment is actually ready
    if (result.nextState !== 'VERCEL_DEPLOYING') {
      const verification = await verifyVercel({ ...ctx, metadata: result.metadata || ctx.metadata });
      if (!verification.success) {
        console.error(`[VERCEL_DEPLOYING] Verification failed: ${verification.error}`);
        // Stay in deploying state
        return { nextState: 'VERCEL_DEPLOYING', metadata: result.metadata };
      }
      console.log(`[VERCEL_DEPLOYING] Verification passed`);
    }

    return result;
  },

  // Step 8: Vercel ready, create ElevenLabs agent
  VERCEL_READY: async (ctx) => {
    console.log(`[VERCEL_READY] Creating ElevenLabs agent...`);
    return createElevenLabsAgent(ctx);
  },

  // Step 9: ElevenLabs agent created, now do final configuration
  ELEVENLABS_CREATING: async (ctx) => {
    console.log(`[ELEVENLABS_CREATING] Waiting for ElevenLabs...`);
    // If we have the agent ID, move to webhook registration
    if (ctx.metadata.elevenLabsAgentId) {
      return { nextState: 'WEBHOOK_REGISTERING', metadata: ctx.metadata };
    }
    return createElevenLabsAgent(ctx);
  },

  // Step 10: Final configuration - Supabase auth, Vercel env vars, webhooks
  // This step now includes full verification before marking COMPLETE
  WEBHOOK_REGISTERING: async (ctx) => {
    console.log(`[WEBHOOK_REGISTERING] Running final configuration...`);
    console.log(`  - Supabase URL: ${ctx.metadata.supabaseUrl}`);
    console.log(`  - Vercel URL: ${ctx.metadata.vercelUrl}`);
    console.log(`  - ElevenLabs Agent ID: ${ctx.metadata.elevenLabsAgentId}`);
    return registerWebhook(ctx);
  },

  // Terminal states - no action needed
  COMPLETE: async (ctx) => {
    console.log(`[COMPLETE] Provisioning complete for ${ctx.projectSlug}!`);
    return { metadata: ctx.metadata };
  },

  FAILED: async (ctx) => {
    console.log(`[FAILED] Provisioning failed for ${ctx.projectSlug}`);
    return { metadata: ctx.metadata };
  },
};

// Helper to check if a state is terminal
export function isTerminalState(state: ProvisionState): boolean {
  return state === 'COMPLETE' || state === 'FAILED';
}

// Helper to get human-readable step description
export function getStepDescription(state: ProvisionState): string {
  const descriptions: Record<ProvisionState, string> = {
    INIT: 'Initializing provisioning...',
    SUPABASE_CREATING: 'Creating Supabase database...',
    SUPABASE_READY: 'Database ready, creating repository...',
    GITHUB_CREATING: 'Creating GitHub repository...',
    GITHUB_READY: 'Repository ready, creating deployment...',
    VERCEL_CREATING: 'Creating Vercel project...',
    VERCEL_DEPLOYING: 'Deploying to Vercel...',
    VERCEL_READY: 'Deployment ready, creating voice agent...',
    ELEVENLABS_CREATING: 'Creating ElevenLabs voice agent...',
    WEBHOOK_REGISTERING: 'Configuring final settings...',
    COMPLETE: 'Provisioning complete!',
    FAILED: 'Provisioning failed',
  };
  return descriptions[state] || state;
}

// Export individual step functions for direct use if needed
export {
  createSupabaseProject,
  waitForSupabaseReady,
  createGithubRepo,
  createVercelProject,
  triggerVercelDeployment,
  createElevenLabsAgent,
  registerWebhook,
};

// Export verification functions
export {
  verifySupabase,
  verifyGitHub,
  verifyVercel,
  verifyAllComplete,
  verifyElevenLabs,
  verifyVercelEnvVars,
  verifyChildSupabaseData,
} from './verify';