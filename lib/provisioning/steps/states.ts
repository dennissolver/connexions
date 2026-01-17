// lib/provisioning/states.ts

export type ProvisionState =
  | 'INIT'
  | 'SUPABASE_CREATING'
  | 'SUPABASE_READY'
  | 'GITHUB_CREATING'
  | 'GITHUB_READY'
  | 'VERCEL_CREATING'
  | 'VERCEL_DEPLOYING'
  | 'VERCEL_READY'
  // Granular ElevenLabs states (replacing single ELEVENLABS_CREATING)
  | 'SANDRA_CREATING'
  | 'SANDRA_READY'
  | 'KIRA_CREATING'
  | 'KIRA_READY'
  // Final steps
  | 'WEBHOOK_REGISTERING'
  | 'COMPLETE'
  | 'FAILED';

/**
 * Allowed state transitions
 * Each state maps to an array of valid next states
 */
export const ALLOWED_TRANSITIONS: Record<ProvisionState, ProvisionState[]> = {
  INIT: ['SUPABASE_CREATING', 'SUPABASE_READY', 'FAILED'],
  
  SUPABASE_CREATING: ['SUPABASE_CREATING', 'SUPABASE_READY', 'FAILED'],
  SUPABASE_READY: ['GITHUB_CREATING', 'GITHUB_READY', 'FAILED'],
  
  GITHUB_CREATING: ['GITHUB_CREATING', 'GITHUB_READY', 'FAILED'],
  GITHUB_READY: ['VERCEL_CREATING', 'VERCEL_DEPLOYING', 'VERCEL_READY', 'FAILED'],
  
  VERCEL_CREATING: ['VERCEL_DEPLOYING', 'VERCEL_READY', 'SANDRA_CREATING', 'FAILED'],
  VERCEL_DEPLOYING: ['VERCEL_DEPLOYING', 'VERCEL_READY', 'SANDRA_CREATING', 'FAILED'],
  VERCEL_READY: ['SANDRA_CREATING', 'FAILED'],
  
  // Sandra (Setup Agent) - creates interview panels
  SANDRA_CREATING: ['SANDRA_CREATING', 'SANDRA_READY', 'FAILED'],
  SANDRA_READY: ['KIRA_CREATING', 'FAILED'],
  
  // Kira (Insights Agent) - data exploration
  KIRA_CREATING: ['KIRA_CREATING', 'KIRA_READY', 'FAILED'],
  KIRA_READY: ['WEBHOOK_REGISTERING', 'COMPLETE', 'FAILED'],
  
  WEBHOOK_REGISTERING: ['WEBHOOK_REGISTERING', 'COMPLETE', 'FAILED'],
  COMPLETE: [],
  FAILED: ['INIT'], // Allow retry from failed state
};

/**
 * Human-readable state descriptions for UI
 */
export const STATE_DESCRIPTIONS: Record<ProvisionState, { title: string; description: string }> = {
  INIT: { 
    title: 'Initializing', 
    description: 'Preparing to provision your platform...' 
  },
  SUPABASE_CREATING: { 
    title: 'Creating Database', 
    description: 'Setting up your Supabase database and authentication...' 
  },
  SUPABASE_READY: { 
    title: 'Database Ready', 
    description: 'Your database is configured and ready.' 
  },
  GITHUB_CREATING: { 
    title: 'Creating Repository', 
    description: 'Setting up GitHub repository with platform code...' 
  },
  GITHUB_READY: { 
    title: 'Repository Ready', 
    description: 'GitHub repository created with all template files.' 
  },
  VERCEL_CREATING: { 
    title: 'Creating Deployment', 
    description: 'Setting up Vercel project with environment variables...' 
  },
  VERCEL_DEPLOYING: { 
    title: 'Deploying', 
    description: 'Building and deploying your platform...' 
  },
  VERCEL_READY: { 
    title: 'Deployment Ready', 
    description: 'Your platform is deployed and accessible.' 
  },
  // Sandra - Setup Agent
  SANDRA_CREATING: { 
    title: 'Creating Sandra', 
    description: 'Setting up your AI Setup Agent for panel creation...' 
  },
  SANDRA_READY: { 
    title: 'Sandra Ready', 
    description: 'Your Setup Agent is configured and ready to help create panels.' 
  },
  // Kira - Insights Agent
  KIRA_CREATING: { 
    title: 'Creating Kira', 
    description: 'Setting up your AI Insights Agent for data exploration...' 
  },
  KIRA_READY: { 
    title: 'Kira Ready', 
    description: 'Your Insights Agent is ready to help explore interview data.' 
  },
  WEBHOOK_REGISTERING: { 
    title: 'Registering Webhooks', 
    description: 'Connecting child platform to parent for monitoring...' 
  },
  COMPLETE: { 
    title: 'Complete', 
    description: 'Your platform is ready to use!' 
  },
  FAILED: { 
    title: 'Failed', 
    description: 'Provisioning encountered an error.' 
  },
};

/**
 * Check if a state transition is valid
 */
export function isValidTransition(from: ProvisionState, to: ProvisionState): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Get progress percentage for UI
 */
export function getProgressPercentage(state: ProvisionState): number {
  const progressMap: Record<ProvisionState, number> = {
    INIT: 0,
    SUPABASE_CREATING: 10,
    SUPABASE_READY: 20,
    GITHUB_CREATING: 25,
    GITHUB_READY: 35,
    VERCEL_CREATING: 40,
    VERCEL_DEPLOYING: 50,
    VERCEL_READY: 60,
    SANDRA_CREATING: 65,
    SANDRA_READY: 75,
    KIRA_CREATING: 80,
    KIRA_READY: 90,
    WEBHOOK_REGISTERING: 95,
    COMPLETE: 100,
    FAILED: 0,
  };
  return progressMap[state] ?? 0;
}

/**
 * Check if state is terminal (no more transitions possible)
 */
export function isTerminalState(state: ProvisionState): boolean {
  return state === 'COMPLETE' || state === 'FAILED';
}

/**
 * Get the step number for UI display (1-indexed)
 */
export function getStepNumber(state: ProvisionState): number {
  const stepOrder: ProvisionState[] = [
    'SUPABASE_CREATING', 'SUPABASE_READY',
    'GITHUB_CREATING', 'GITHUB_READY',
    'VERCEL_CREATING', 'VERCEL_DEPLOYING', 'VERCEL_READY',
    'SANDRA_CREATING', 'SANDRA_READY',
    'KIRA_CREATING', 'KIRA_READY',
    'WEBHOOK_REGISTERING',
    'COMPLETE',
  ];
  const index = stepOrder.indexOf(state);
  return index >= 0 ? Math.floor(index / 2) + 1 : 0;
}

/**
 * Total number of major steps (for progress indicator)
 */
export const TOTAL_STEPS = 7; // Supabase, GitHub, Vercel, Sandra, Kira, Webhooks, Complete
