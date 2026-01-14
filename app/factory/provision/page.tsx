'use client';

import { Suspense } from 'react';
import ProvisionClient from './provision-client';

export const dynamic = 'force-dynamic';

export default function ProvisionPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading provisioning…</div>}>
      <ProvisionClient />
    </Suspense>
  );
}
