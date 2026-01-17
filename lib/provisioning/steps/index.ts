import * as supabase from './supabase';
import * as vercel from './vercel';
import * as github from './github';
import * as eleven from './eleven';

export const STEPS: any = {
  SUPABASE_EXECUTING: supabase,
  VERCEL_EXECUTING: vercel,
  GITHUB_EXECUTING: github,
  ELEVEN_EXECUTING: eleven,
};
