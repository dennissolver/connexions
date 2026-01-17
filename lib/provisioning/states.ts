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
  // Granular ElevenLabs states
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
 */
export const ALLOWED_TRANSITIONS: Record<ProvisionState, ProvisionState[]> = {
  INIT: ['SUPABASE_CREATING', 'FAILED'],

  SUPABASE_CREATING: ['SUPABASE_CREATING', 'SUPABASE_READY', 'FAILED'],
  SUPABASE_READY: ['GITHUB_CREATING', 'FAILED'],

  GITHUB_CREATING: ['GITHUB_CREATING', 'GITHUB_READY', 'FAILED'],
  GITHUB_READY: ['VERCEL_CREATING', 'FAILED'],

  VERCEL_CREATING: ['VERCEL_CREATING', 'VERCEL_DEPLOYING', 'VERCEL_READY', 'SANDRA_CREATING', 'FAILED'],
  VERCEL_DEPLOYING: ['VERCEL_DEPLOYING', 'VERCEL_READY', 'SANDRA_CREATING', 'FAILED'],
  VERCEL_READY: ['SANDRA_CREATING', 'FAILED'],

  // Sandra (Setup Agent)
  SANDRA_CREATING: ['SANDRA_CREATING', 'SANDRA_READY', 'FAILED'],
  SANDRA_READY: ['KIRA_CREATING', 'FAILED'],

  // Kira (Insights Agent)
  KIRA_CREATING: ['KIRA_CREATING', 'KIRA_READY', 'FAILED'],
  KIRA_READY: ['WEBHOOK_REGISTERING', 'COMPLETE', 'FAILED'],

  WEBHOOK_REGISTERING: ['WEBHOOK_REGISTERING', 'COMPLETE', 'FAILED'],
  COMPLETE: [],
  FAILED: ['INIT'],
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
    description: 'Setting up Supabase database and authentication...'
  },
  SUPABASE_READY: {
    title: 'Database Ready',
    description: 'Database configured and ready.'
  },
  GITHUB_CREATING: {
    title: 'Creating Repository',
    description: 'Setting up GitHub repository with platform code...'
  },
  GITHUB_READY: {
    title: 'Repository Ready',
    description: 'GitHub repository created.'
  },
  VERCEL_CREATING: {
    title: 'Creating Deployment',
    description: 'Setting up Vercel project...'
  },
  VERCEL_DEPLOYING: {
    title: 'Deploying',
    description: 'Building and deploying your platform...'
  },
  VERCEL_READY: {
    title: 'Deployment Ready',
    description: 'Platform deployed and accessible.'
  },
  SANDRA_CREATING: {
    title: 'Creating Sandra',
    description: 'Setting up your AI Setup Agent...'
  },
  SANDRA_READY: {
    title: 'Sandra Ready',
    description: 'Setup Agent configured.'
  },
  KIRA_CREATING: {
    title: 'Creating Kira',
    description: 'Setting up your AI Insights Agent...'
  },
  KIRA_READY: {
    title: 'Kira Ready',
    description: 'Insights Agent configured.'
  },
  WEBHOOK_REGISTERING: {
    title: 'Registering Webhooks',
    description: 'Connecting platform webhooks...'
  },
  COMPLETE: {
    title: 'Complete',
    description: 'Your platform is ready!'
  },
  FAILED: {
    title: 'Failed',
    description: 'Provisioning encountered an error.'
  },
};
// Alias for backward compatibility with ProvisioningProgress component
export const PROVISION_UI = STATE_DESCRIPTIONS;
