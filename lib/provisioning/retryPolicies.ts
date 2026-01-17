
export const RETRY_POLICIES = {
  supabase: { maxRetries: 6, baseDelayMs: 2000, maxDelayMs: 20000 },
  github: { maxRetries: 4, baseDelayMs: 5000, maxDelayMs: 60000 },
  vercel: { maxRetries: 8, baseDelayMs: 10000, maxDelayMs: 90000 },
  sandra: { maxRetries: 5, baseDelayMs: 3000, maxDelayMs: 30000 },
  kira: { maxRetries: 5, baseDelayMs: 3000, maxDelayMs: 30000 },
  webhook: { maxRetries: 3, baseDelayMs: 2000, maxDelayMs: 15000 },
};
