'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useProvisioning } from '@/app/hooks/useProvisioning';

export default function ProvisionClient() {
  const router = useRouter();
  const params = useSearchParams();

  const platformId = params.get('platformId');

  useEffect(() => {
    if (!platformId) {
      router.replace('/dashboard');
    }
  }, [platformId, router]);

  if (!platformId) return null;

  const { state, metadata, error } = useProvisioning(platformId);

  useEffect(() => {
    if (state === 'COMPLETE') {
      router.replace('/dashboard');
    }
  }, [state, router]);

  return (
    <div className="max-w-xl mx-auto py-16 space-y-6">
      <h1 className="text-2xl font-semibold">Setting up your platform</h1>

      <div className="text-sm text-muted-foreground">
        Current step: <strong>{state}</strong>
      </div>

      <div className="h-2 bg-muted rounded overflow-hidden">
        <div className="h-2 bg-purple-600 animate-pulse w-2/3" />
      </div>

      {metadata && Object.keys(metadata).length > 0 && (
        <pre className="bg-muted p-4 rounded text-xs overflow-auto">
          {JSON.stringify(metadata, null, 2)}
        </pre>
      )}

      {error && (
        <div className="text-red-500 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
