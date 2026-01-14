// app/components/ProvisioningStatus.tsx
'use client';

const STATE_LABELS: Record<string, string> = {
  INIT: 'Starting provisioningâ€¦',
  GITHUB_CREATING: 'Creating GitHub repositoryâ€¦',
  SUPABASE_CREATING: 'Creating Supabase projectâ€¦',
  SUPABASE_READY: 'Waiting for Supabaseâ€¦',
  SCHEMA_MIGRATED: 'Applying database schemaâ€¦',
  AUTH_CONFIGURED: 'Configuring authenticationâ€¦',
  STORAGE_READY: 'Preparing storageâ€¦',
  VERCEL_CREATING: 'Creating Vercel projectâ€¦',
  VERCEL_DEPLOYING: 'Deploying applicationâ€¦',
  STRIPE_CUSTOMER_CREATING: 'Creating billing profileâ€¦',
  STRIPE_SUBSCRIPTION_CREATING: 'Activating subscriptionâ€¦',
  COMPLETE: 'Provisioning complete',
  FAILED: 'Provisioning failed â€“ team notified',
};

export function ProvisioningStatus({
  state,
  error,
}: {
  state: string;
  error?: string | null;
}) {
  return (
    <div className="rounded-md border p-4 space-y-2">
      <div className="font-medium">
        {STATE_LABELS[state] ?? state}
      </div>

      {state === 'FAILED' && (
        <div className="text-sm text-red-600">
          {error ?? 'Something went wrong'}
        </div>
      )}
    </div>
  );
}

