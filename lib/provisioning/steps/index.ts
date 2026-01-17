// lib/provisioning/index.ts (orchestrator)

import { ProvisionContext, ProvisionStepResult, ProvisionRun } from './types';
import { 
  ProvisionState, 
  ALLOWED_TRANSITIONS, 
  isValidTransition, 
  isTerminalState,
  STATE_DESCRIPTIONS 
} from './states';

// Step imports
import { createSupabaseProject, verifySupabaseReady } from './steps/supabase';
import { createGitHubRepo, verifyGitHubReady } from './steps/github';
import { createVercelProject, triggerVercelDeployment, verifyVercelReady } from './steps/vercel';
import { createSandraAgent, createKiraAgent } from './steps/elevenlabs';
import { registerWebhooks } from './steps/webhook';
import { getProvisionRun, updateProvisionRun } from './engine';

/**
 * Run a single provisioning step based on current state
 */
export async function runProvisioningStep(ctx: ProvisionContext): Promise<ProvisionStepResult> {
  const currentState = ctx.state;
  console.log(`[orchestrator] Running step for state: ${currentState}`);
  
  try {
    let result: ProvisionStepResult;

    switch (currentState) {
      // ========== INIT ==========
      case 'INIT':
        result = { nextState: 'SUPABASE_CREATING', metadata: ctx.metadata };
        break;

      // ========== SUPABASE ==========
      case 'SUPABASE_CREATING':
        result = await createSupabaseProject(ctx);
        break;
        
      case 'SUPABASE_READY':
        // Verify and move to GitHub
        const supabaseOk = await verifySupabaseReady(ctx);
        if (!supabaseOk) {
          throw new Error('Supabase verification failed');
        }
        result = { nextState: 'GITHUB_CREATING', metadata: ctx.metadata };
        break;

      // ========== GITHUB ==========
      case 'GITHUB_CREATING':
        result = await createGitHubRepo(ctx);
        break;
        
      case 'GITHUB_READY':
        // Verify and move to Vercel
        const githubOk = await verifyGitHubReady(ctx);
        if (!githubOk) {
          throw new Error('GitHub verification failed');
        }
        result = { nextState: 'VERCEL_CREATING', metadata: ctx.metadata };
        break;

      // ========== VERCEL ==========
      case 'VERCEL_CREATING':
        result = await createVercelProject(ctx);
        break;
        
      case 'VERCEL_DEPLOYING':
        result = await triggerVercelDeployment(ctx);
        break;
        
      case 'VERCEL_READY':
        // Verify and move to Sandra
        const vercelOk = await verifyVercelReady(ctx);
        if (!vercelOk) {
          throw new Error('Vercel verification failed');
        }
        result = { nextState: 'SANDRA_CREATING', metadata: ctx.metadata };
        break;

      // ========== SANDRA (Setup Agent) ==========
      case 'SANDRA_CREATING':
        result = await createSandraAgent(ctx);
        break;
        
      case 'SANDRA_READY':
        // Sandra is verified within createSandraAgent, move to Kira
        result = { nextState: 'KIRA_CREATING', metadata: ctx.metadata };
        break;

      // ========== KIRA (Insights Agent) ==========
      case 'KIRA_CREATING':
        result = await createKiraAgent(ctx);
        break;
        
      case 'KIRA_READY':
        // Kira is verified within createKiraAgent, move to webhooks
        result = { nextState: 'WEBHOOK_REGISTERING', metadata: ctx.metadata };
        break;

      // ========== WEBHOOKS ==========
      case 'WEBHOOK_REGISTERING':
        result = await registerWebhooks(ctx);
        break;

      // ========== TERMINAL STATES ==========
      case 'COMPLETE':
        console.log(`[orchestrator] Provisioning complete for ${ctx.projectSlug}`);
        result = { nextState: 'COMPLETE', metadata: ctx.metadata };
        break;
        
      case 'FAILED':
        console.log(`[orchestrator] Provisioning failed for ${ctx.projectSlug}`);
        result = { nextState: 'FAILED', metadata: ctx.metadata };
        break;

      default:
        throw new Error(`Unknown state: ${currentState}`);
    }

    // Validate state transition
    if (!isValidTransition(currentState, result.nextState)) {
      console.error(`[orchestrator] Invalid transition: ${currentState} → ${result.nextState}`);
      console.error(`[orchestrator] Allowed transitions from ${currentState}: ${ALLOWED_TRANSITIONS[currentState]?.join(', ')}`);
      throw new Error(`Invalid state transition: ${currentState} → ${result.nextState}`);
    }

    console.log(`[orchestrator] Transition: ${currentState} → ${result.nextState}`);
    return result;

  } catch (error: any) {
    console.error(`[orchestrator] Step failed:`, error);
    
    // Return FAILED state with error info
    return {
      nextState: 'FAILED',
      metadata: {
        ...ctx.metadata,
        error: error.message,
        errorState: currentState,
        errorTimestamp: new Date().toISOString(),
      },
    };
  }
}

/**
 * Advance provisioning by one step
 * Called by status polling endpoint
 */
export async function advanceProvisioning(projectSlug: string): Promise<ProvisionRun | null> {
  const run = await getProvisionRun(projectSlug);
  if (!run) {
    console.error(`[orchestrator] Run not found: ${projectSlug}`);
    return null;
  }

  // Don't advance if in terminal state
  if (isTerminalState(run.state as ProvisionState)) {
    console.log(`[orchestrator] Already in terminal state: ${run.state}`);
    return run;
  }

  // Build context from stored run data
  const ctx: ProvisionContext = {
    projectSlug,
    platformName: run.platform_name || projectSlug,
    state: run.state as ProvisionState,
    metadata: run.metadata || {},
    // These should be loaded from secure storage/env
    supabaseAccessToken: process.env.SUPABASE_ACCESS_TOKEN!,
    githubToken: process.env.GITHUB_TOKEN!,
    vercelToken: process.env.VERCEL_TOKEN!,
    elevenLabsApiKey: process.env.ELEVENLABS_API_KEY!,
    publicBaseUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://connexions.ai',
  };

  // Run the step
  const result = await runProvisioningStep(ctx);

  // Update the run with new state
  const updatedRun = await updateProvisionRun(projectSlug, {
    state: result.nextState,
    metadata: result.metadata,
    ...(result.nextState === 'COMPLETE' ? { completed_at: new Date().toISOString() } : {}),
    ...(result.nextState === 'FAILED' ? { 
      error: result.metadata?.error,
      failed_at: new Date().toISOString(),
    } : {}),
  });

  return updatedRun;
}

/**
 * Get human-readable status for current state
 */
export function getStateDescription(state: ProvisionState): { title: string; description: string } {
  return STATE_DESCRIPTIONS[state] || { 
    title: 'Unknown', 
    description: 'Unknown state' 
  };
}

/**
 * Initialize a new provisioning run
 */
export async function initializeProvisioning(
  projectSlug: string,
  platformName: string,
  initialMetadata?: Record<string, any>
): Promise<ProvisionRun> {
  const run = await updateProvisionRun(projectSlug, {
    state: 'INIT',
    platform_name: platformName,
    metadata: initialMetadata || {},
    started_at: new Date().toISOString(),
  });

  if (!run) {
    throw new Error(`Failed to initialize provisioning for ${projectSlug}`);
  }

  return run;
}

// Re-export types and utilities
export * from './types';
export * from './states';
