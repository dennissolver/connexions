
export async function createVercel(ctx: any) {
  return { nextState: 'VERCEL_VERIFYING', metadata: ctx.metadata };
}
