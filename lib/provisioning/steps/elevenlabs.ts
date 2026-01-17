
export async function createSandra(ctx: any) {
  return { nextState: 'SANDRA_VERIFYING', metadata: ctx.metadata };
}

export async function createKira(ctx: any) {
  return { nextState: 'KIRA_VERIFYING', metadata: ctx.metadata };
}
