
// lib/provisioning/verify.ts
export type VerificationResult = {
  ok: boolean;
  retryable: boolean;
  reason?: string;
};

export async function verifyComponent(component: string, ctx: any): Promise<VerificationResult> {
  switch (component) {
    case 'sandra':
      return verifyElevenLabsAgent(ctx.metadata?.sandraAgentId, ctx.elevenLabsApiKey);
    case 'kira':
      return verifyElevenLabsAgent(ctx.metadata?.kiraAgentId, ctx.elevenLabsApiKey);
    default:
      return { ok: false, retryable: false, reason: 'Unknown component' };
  }
}

async function verifyElevenLabsAgent(agentId?: string, apiKey?: string): Promise<VerificationResult> {
  if (!agentId || !apiKey) {
    return { ok: false, retryable: false, reason: 'Missing agentId or apiKey' };
  }

  const res = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
    headers: { 'xi-api-key': apiKey },
  });

  if (!res.ok) {
    if (res.status >= 500) {
      return { ok: false, retryable: true, reason: 'ElevenLabs unavailable' };
    }
    return { ok: false, retryable: false, reason: 'Agent not accessible' };
  }

  const agent = await res.json();
  const tools = agent?.conversation_config?.agent?.prompt?.tools;

  if (!Array.isArray(tools) || tools.length === 0) {
    return { ok: false, retryable: true, reason: 'Tools not yet validated' };
  }

  for (const t of tools) {
    if (t.type === 'webhook' && !t.webhook?.api_schema?.url) {
      return { ok: false, retryable: false, reason: 'Invalid webhook schema' };
    }
  }

  return { ok: true, retryable: false };
}
