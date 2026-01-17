
export async function registerWebhooks(ctx: any) {
  return { nextState: 'WEBHOOK_VERIFYING', metadata: ctx.metadata };
}
