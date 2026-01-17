
import { createSupabase } from './supabase';
import { createGithub } from './github';
import { createVercel } from './vercel';
import { createSandra, createKira } from './elevenlabs';
import { registerWebhooks } from './webhook';

export const STEPS = {
  SUPABASE_CREATING: createSupabase,
  GITHUB_CREATING: createGithub,
  VERCEL_CREATING: createVercel,
  SANDRA_CREATING: createSandra,
  KIRA_CREATING: createKira,
  WEBHOOK_REGISTERING: registerWebhooks,
};
