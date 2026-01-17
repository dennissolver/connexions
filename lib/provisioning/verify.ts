
export type VerificationResult = {
  ok: boolean;
  retryable: boolean;
  reason?: string;
};

export async function verify(component: string, ctx: any): Promise<VerificationResult> {
  switch (component) {
    case 'sandra':
    case 'kira':
      return verifyElevenLabs(ctx);
    case 'supabase':
      return verifySupabase(ctx);
    case 'github':
      return verifyGithub(ctx);
    case 'vercel':
      return verifyVercel(ctx);
    case 'webhook':
      return { ok: true, retryable: false };
    default:
      return { ok: false, retryable: false, reason: 'Unknown component' };
  }
}

async function verifyElevenLabs(ctx: any): Promise<VerificationResult> {
  const agentId = ctx.metadata?.sandraAgentId || ctx.metadata?.kiraAgentId;
  if (!agentId) return { ok: false, retryable: false, reason: 'Missing agent ID' };

  const res = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
    headers: { 'xi-api-key': ctx.elevenLabsApiKey },
  });

  if (!res.ok) {
    if (res.status >= 500) return { ok: false, retryable: true, reason: 'ElevenLabs unavailable' };
    return { ok: false, retryable: false, reason: 'Agent not accessible' };
  }

  const agent = await res.json();
  const tools = agent?.conversation_config?.agent?.prompt?.tools;
  if (!Array.isArray(tools) || tools.length === 0) {
    return { ok: false, retryable: true, reason: 'Agent not yet validated' };
  }

  return { ok: true, retryable: false };
}

async function verifySupabase(ctx: any): Promise<VerificationResult> {
  return ctx.metadata?.supabaseProjectRef
    ? { ok: true, retryable: false }
    : { ok: false, retryable: false, reason: 'Missing Supabase project ref' };
}

async function verifyGithub(ctx: any): Promise<VerificationResult> {
  return ctx.metadata?.githubRepo
    ? { ok: true, retryable: false }
    : { ok: false, retryable: false, reason: 'Missing GitHub repo' };
}

async function verifyVercel(ctx: any): Promise<VerificationResult> {
  return ctx.metadata?.vercelUrl
    ? { ok: true, retryable: false }
    : { ok: false, retryable: true, reason: 'Vercel deployment not ready' };
}
