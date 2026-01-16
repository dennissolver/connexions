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
  | 'ELEVENLABS_CREATING'
  | 'WEBHOOK_REGISTERING'
  | 'COMPLETE'
  | 'FAILED';

export const ALLOWED_TRANSITIONS: Record<ProvisionState, ProvisionState[]> = {
  INIT: ['SUPABASE_CREATING', 'SUPABASE_READY', 'FAILED'],
  SUPABASE_CREATING: ['SUPABASE_CREATING', 'SUPABASE_READY', 'FAILED'],
  SUPABASE_READY: ['GITHUB_CREATING', 'GITHUB_READY', 'FAILED'],
  GITHUB_CREATING: ['GITHUB_CREATING', 'GITHUB_READY', 'FAILED'],
  GITHUB_READY: ['VERCEL_CREATING', 'VERCEL_DEPLOYING', 'VERCEL_READY', 'FAILED'],
  VERCEL_CREATING: ['VERCEL_DEPLOYING', 'VERCEL_READY', 'ELEVENLABS_CREATING', 'FAILED'],  // ← ADD ELEVENLABS_CREATING
  VERCEL_DEPLOYING: ['VERCEL_DEPLOYING', 'VERCEL_READY', 'ELEVENLABS_CREATING', 'FAILED'],
  VERCEL_READY: ['ELEVENLABS_CREATING', 'WEBHOOK_REGISTERING', 'COMPLETE', 'FAILED'],
  ELEVENLABS_CREATING: ['ELEVENLABS_CREATING', 'WEBHOOK_REGISTERING', 'COMPLETE', 'FAILED'],
  WEBHOOK_REGISTERING: ['WEBHOOK_REGISTERING', 'COMPLETE', 'FAILED'],
  COMPLETE: [],
  FAILED: ['INIT'],
};

export const PROVISION_UI: Record<ProvisionState, { title: string; description: string }> = {
  INIT: { title: 'Initializing', description: 'Preparing to provision your platform...' },
  SUPABASE_CREATING: { title: 'Creating Database', description: 'Setting up Supabase project and schema...' },
  SUPABASE_READY: { title: 'Database Ready', description: 'Supabase project is active and configured.' },
  GITHUB_CREATING: { title: 'Creating Repository', description: 'Setting up GitHub repository with platform code...' },
  GITHUB_READY: { title: 'Repository Ready', description: 'GitHub repository created with all template files.' },
  VERCEL_CREATING: { title: 'Creating Deployment', description: 'Setting up Vercel project with environment variables...' },
  VERCEL_DEPLOYING: { title: 'Deploying', description: 'Building and deploying your platform...' },
  VERCEL_READY: { title: 'Deployment Ready', description: 'Platform deployed successfully.' },
  ELEVENLABS_CREATING: { title: 'Creating Voice Agent', description: 'Configuring ElevenLabs setup agent...' },
  WEBHOOK_REGISTERING: { title: 'Registering Webhooks', description: 'Connecting child platform to parent...' },
  COMPLETE: { title: 'Complete', description: 'Your platform is ready to use!' },
  FAILED: { title: 'Failed', description: 'Provisioning encountered an error.' },
};