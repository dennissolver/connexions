export async function createVercelProject(ctx: {
  projectSlug: string;
}) {
  return {
    nextState: 'VERCEL_READY',
    metadata: {},
  };
}
