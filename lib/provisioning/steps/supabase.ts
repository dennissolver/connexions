export async function createSupabaseProject(ctx: {
  projectSlug: string;
}) {
  // real implementation already exists elsewhere
  // this is the contract the registry expects
  return {
    nextState: 'SUPABASE_READY',
    metadata: {},
  };
}
