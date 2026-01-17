// lib/provisioning/registry.ts
// SINGLE SOURCE OF TRUTH for state machine routing
// No other file decides transitions or handlers

import {
  ProvisionState,
  ProvisionContext,
  StepResult,
  StepHandler,
  isTerminalState,
} from './types';

// Service handlers
import { supabaseExecute } from './supabase/execute';
import { supabaseVerify } from './supabase/verify';
import { githubExecute } from './github/execute';
import { githubVerify } from './github/verify';
import { vercelExecute } from './vercel/execute';
import { vercelVerify } from './vercel/verify';
import { sandraExecute, kiraExecute } from './elevenlabs/execute';
import { sandraVerify, kiraVerify } from './elevenlabs/verify';
import { webhookExecute } from './webhooks/execute';
import { webhookVerify } from './webhooks/verify';

// =============================================================================
// STATE TRANSITIONS
// =============================================================================

// Defines what state follows successful completion of current state
const TRANSITIONS: Record<ProvisionState, ProvisionState | null> = {
  // Supabase
  'SUPABASE_CREATING': 'SUPABASE_VERIFYING',
  'SUPABASE_VERIFYING': 'SUPABASE_READY',
  'WAITING_SUPABASE': 'SUPABASE_VERIFYING',
  'SUPABASE_READY': 'GITHUB_CREATING',

  // GitHub
  'GITHUB_CREATING': 'GITHUB_VERIFYING',
  'GITHUB_VERIFYING': 'GITHUB_READY',
  'WAITING_GITHUB': 'GITHUB_VERIFYING',
  'GITHUB_READY': 'VERCEL_CREATING',

  // Vercel
  'VERCEL_CREATING': 'VERCEL_VERIFYING',
  'VERCEL_VERIFYING': 'VERCEL_READY',
  'WAITING_VERCEL': 'VERCEL_VERIFYING',
  'VERCEL_READY': 'SANDRA_CREATING',

  // Sandra (ElevenLabs setup agent)
  'SANDRA_CREATING': 'SANDRA_VERIFYING',
  'SANDRA_VERIFYING': 'SANDRA_READY',
  'WAITING_SANDRA': 'SANDRA_VERIFYING',
  'SANDRA_READY': 'KIRA_CREATING',

  // Kira (ElevenLabs insights agent)
  'KIRA_CREATING': 'KIRA_VERIFYING',
  'KIRA_VERIFYING': 'KIRA_READY',
  'WAITING_KIRA': 'KIRA_VERIFYING',
  'KIRA_READY': 'WEBHOOK_REGISTERING',

  // Webhooks
  'WEBHOOK_REGISTERING': 'WEBHOOK_VERIFYING',
  'WEBHOOK_VERIFYING': 'COMPLETE',

  // Terminal
  'COMPLETE': null,
  'FAILED': null,
};

// =============================================================================
// HANDLER ROUTING
// =============================================================================

// Maps states to their handler functions
const HANDLERS: Partial<Record<ProvisionState, StepHandler>> = {
  // Supabase
  'SUPABASE_CREATING': supabaseExecute,
  'SUPABASE_VERIFYING': supabaseVerify,
  'WAITING_SUPABASE': supabaseVerify,

  // GitHub
  'GITHUB_CREATING': githubExecute,
  'GITHUB_VERIFYING': githubVerify,
  'WAITING_GITHUB': githubVerify,

  // Vercel
  'VERCEL_CREATING': vercelExecute,
  'VERCEL_VERIFYING': vercelVerify,
  'WAITING_VERCEL': vercelVerify,

  // Sandra
  'SANDRA_CREATING': sandraExecute,
  'SANDRA_VERIFYING': sandraVerify,
  'WAITING_SANDRA': sandraVerify,

  // Kira
  'KIRA_CREATING': kiraExecute,
  'KIRA_VERIFYING': kiraVerify,
  'WAITING_KIRA': kiraVerify,

  // Webhooks
  'WEBHOOK_REGISTERING': webhookExecute,
  'WEBHOOK_VERIFYING': webhookVerify,
};

// =============================================================================
// PUBLIC API
// =============================================================================

export function getHandler(state: ProvisionState): StepHandler | null {
  if (isTerminalState(state)) {
    return null;
  }
  return HANDLERS[state] || null;
}

export function getNextState(currentState: ProvisionState): ProvisionState | null {
  return TRANSITIONS[currentState];
}

export function getWaitingState(currentState: ProvisionState): ProvisionState | null {
  // Map verifying states to their waiting counterparts
  const waitMap: Partial<Record<ProvisionState, ProvisionState>> = {
    'SUPABASE_VERIFYING': 'WAITING_SUPABASE',
    'GITHUB_VERIFYING': 'WAITING_GITHUB',
    'VERCEL_VERIFYING': 'WAITING_VERCEL',
    'SANDRA_VERIFYING': 'WAITING_SANDRA',
    'KIRA_VERIFYING': 'WAITING_KIRA',
  };
  return waitMap[currentState] || null;
}

// =============================================================================
// UI METADATA
// =============================================================================

export interface StepUiMeta {
  title: string;
  description: string;
  progress: number;
}

export function getStepUiMeta(state: ProvisionState): StepUiMeta {
  const meta: Record<ProvisionState, StepUiMeta> = {
    'SUPABASE_CREATING': { title: 'Database', description: 'Creating Supabase project...', progress: 5 },
    'SUPABASE_VERIFYING': { title: 'Database', description: 'Verifying database...', progress: 10 },
    'WAITING_SUPABASE': { title: 'Database', description: 'Waiting for database...', progress: 10 },
    'SUPABASE_READY': { title: 'Database', description: 'Database ready', progress: 15 },

    'GITHUB_CREATING': { title: 'Repository', description: 'Creating repository...', progress: 20 },
    'GITHUB_VERIFYING': { title: 'Repository', description: 'Verifying repository...', progress: 25 },
    'WAITING_GITHUB': { title: 'Repository', description: 'Waiting for repository...', progress: 25 },
    'GITHUB_READY': { title: 'Repository', description: 'Repository ready', progress: 30 },

    'VERCEL_CREATING': { title: 'Deployment', description: 'Creating deployment...', progress: 40 },
    'VERCEL_VERIFYING': { title: 'Deployment', description: 'Verifying deployment...', progress: 50 },
    'WAITING_VERCEL': { title: 'Deployment', description: 'Waiting for deployment...', progress: 50 },
    'VERCEL_READY': { title: 'Deployment', description: 'Deployment ready', progress: 55 },

    'SANDRA_CREATING': { title: 'Setup Agent', description: 'Creating Sandra...', progress: 60 },
    'SANDRA_VERIFYING': { title: 'Setup Agent', description: 'Verifying Sandra...', progress: 65 },
    'WAITING_SANDRA': { title: 'Setup Agent', description: 'Waiting for Sandra...', progress: 65 },
    'SANDRA_READY': { title: 'Setup Agent', description: 'Sandra ready', progress: 70 },

    'KIRA_CREATING': { title: 'Insights Agent', description: 'Creating Kira...', progress: 75 },
    'KIRA_VERIFYING': { title: 'Insights Agent', description: 'Verifying Kira...', progress: 80 },
    'WAITING_KIRA': { title: 'Insights Agent', description: 'Waiting for Kira...', progress: 80 },
    'KIRA_READY': { title: 'Insights Agent', description: 'Kira ready', progress: 85 },

    'WEBHOOK_REGISTERING': { title: 'Webhooks', description: 'Registering webhooks...', progress: 90 },
    'WEBHOOK_VERIFYING': { title: 'Webhooks', description: 'Verifying webhooks...', progress: 95 },

    'COMPLETE': { title: 'Complete', description: 'Platform ready', progress: 100 },
    'FAILED': { title: 'Failed', description: 'Provisioning failed', progress: 100 },
  };

  return meta[state];
}
