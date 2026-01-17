
// lib/provisioning/retryPolicies.ts
export const RETRY_POLICIES = {
  sandra: { maxRetries: 5, baseDelayMs: 3000, maxDelayMs: 30000 },
  kira: { maxRetries: 5, baseDelayMs: 3000, maxDelayMs: 30000 },
  github: { maxRetries: 4, baseDelayMs: 5000, maxDelayMs: 60000 },
  vercel: { maxRetries: 8, baseDelayMs: 10000, maxDelayMs: 90000 },
  supabase: { maxRetries: 6, baseDelayMs: 2000, maxDelayMs: 20000 },
};
