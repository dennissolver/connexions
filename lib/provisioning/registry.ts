
import { ProvisionState, ProvisionContext, StepResult } from './types';
import { supabaseExecute } from './steps/supabase.execute';
import { supabaseVerify } from './steps/supabase.verify';
import { githubExecute } from './steps/github.execute';
import { githubVerify } from './steps/github.verify';
import { vercelExecute } from './steps/vercel.execute';
import { vercelVerify } from './steps/vercel.verify';
import { elevenExecute } from './steps/elevenlabs.execute';
import { elevenVerify } from './steps/elevenlabs.verify';
import { webhookExecute } from './steps/webhooks.execute';

export async function runStep(
  state: ProvisionState,
  ctx: ProvisionContext
): Promise<StepResult> {
  switch (state) {
    case 'SUPABASE_EXECUTE': return supabaseExecute(ctx);
    case 'SUPABASE_VERIFY': return supabaseVerify(ctx);
    case 'GITHUB_EXECUTE': return githubExecute(ctx);
    case 'GITHUB_VERIFY': return githubVerify(ctx);
    case 'VERCEL_EXECUTE': return vercelExecute(ctx);
    case 'VERCEL_VERIFY': return vercelVerify(ctx);
    case 'ELEVENLABS_EXECUTE': return elevenExecute(ctx);
    case 'ELEVENLABS_VERIFY': return elevenVerify(ctx);
    case 'WEBHOOK_EXECUTE': return webhookExecute(ctx);
    default:
      return { status: 'advance', next: 'COMPLETE' };
  }
}
