
export async function createGithub(ctx: any) {
  return { nextState: 'GITHUB_VERIFYING', metadata: ctx.metadata };
}
