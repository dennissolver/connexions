// app/components/ProvisioningProgress.tsx
'use client';

const STATE_PROGRESS: Record<string, number> = {
  INIT: 5,
  GITHUB_CREATING: 10,
  SUPABASE_CREATING: 20,
  SUPABASE_READY: 35,
  SCHEMA_MIGRATED: 50,
  AUTH_CONFIGURED: 65,
  STORAGE_READY: 75,
  VERCEL_CREATING: 82,
  VERCEL_DEPLOYING: 88,
  STRIPE_CUSTOMER_CREATING: 94,
  STRIPE_SUBSCRIPTION_CREATING: 98,
  COMPLETE: 100,
  FAILED: 100,
};

export function ProvisioningProgress({ state }: { state: string }) {
  const value = STATE_PROGRESS[state] ?? 0;

  return (
    <div className="space-y-2">
      <div className="h-2 w-full rounded bg-muted overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${value}%` }}
        />
      </div>
      <div className="text-xs text-muted-foreground">
        {value}% complete
      </div>
    </div>
  );
}

