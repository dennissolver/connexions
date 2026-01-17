export async function createSandraAgent(ctx: {
  projectSlug: string;
}) {
  return {
    nextState: 'SANDRA_READY',
    metadata: {},
  };
}

export async function createKiraAgent(ctx: {
  projectSlug: string;
}) {
  return {
    nextState: 'KIRA_READY',
    metadata: {},
  };
}
