export async function createGithubRepo(ctx: {
  projectSlug: string;
}) {
  return {
    nextState: 'GITHUB_READY',
    metadata: {},
  };
}
