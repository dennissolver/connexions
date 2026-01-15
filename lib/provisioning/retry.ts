// lib/provisioning/retry.ts
export async function shouldRetryProvisioning(projectSlug: string): Promise<boolean> {
  return false;
}

export async function recordRetry(projectSlug: string): Promise<void> {
  console.log('Retry recorded:', projectSlug);
}
