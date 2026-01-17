
export async function createSupabase(ctx: any) {
  return { nextState: 'SUPABASE_VERIFYING', metadata: ctx.metadata };
}
