// app/factory/provision/page.tsx
'use client';

import { useProvisioning } from '@/app/hooks/useProvisioning';
import { ProvisioningStatus } from '@/app/components/ProvisioningStatus';
import { ProvisioningProgress } from '@/app/components/ProvisioningProgress';

export default function ProvisionPage() {
  const platformName = 'demo-platform'; // replace dynamically
  const publicBaseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ?? '';

  const {
    state,
    metadata,
    loading,
    error,
    isComplete,
  } = useProvisioning(platformName, publicBaseUrl);

  return (
    <div className="max-w-xl mx-auto py-12 space-y-6">
      <h1 className="text-2xl font-semibold">
        Platform Provisioning
      </h1>

      <ProvisioningProgress state={state} />

      <ProvisioningStatus state={state} error={error} />

      {isComplete && (
        <pre className="bg-muted p-4 rounded text-xs overflow-auto">
          {JSON.stringify(metadata, null, 2)}
        </pre>
      )}

      {loading && (
        <div className="text-sm text-muted-foreground">
          Checking statusâ€¦
        </div>
      )}
    </div>
  );
}

