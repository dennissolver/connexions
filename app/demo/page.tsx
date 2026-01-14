// app/demo/page.tsx
import { Suspense } from 'react';
import DemoClient from './DemoClient';

export default function DemoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    }>
      <DemoClient />
    </Suspense>
  );
}
