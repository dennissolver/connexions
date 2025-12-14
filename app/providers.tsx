'use client';

import dynamic from 'next/dynamic';

const Toaster = dynamic(
  () => import('sonner').then((mod) => mod.Toaster),
  { ssr: false }
);

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster position="top-right" richColors />
    </>
  );
}