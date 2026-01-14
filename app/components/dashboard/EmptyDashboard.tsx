'use client';

import Link from 'next/link';
import { Rocket, Bot, FileText } from 'lucide-react';

export default function EmptyDashboard() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center space-y-6">
      <div className="text-3xl font-semibold">
        Welcome to Connexions 👋
      </div>

      <p className="text-muted-foreground max-w-md">
        Your platform is ready. The next step is to create your first AI
        interview agent.
      </p>

      <div className="flex gap-4">
        <Link
          href="/create"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-purple-600 text-white hover:bg-purple-500"
        >
          <Bot className="w-5 h-5" />
          Create your first agent
        </Link>

        <Link
          href="/demo"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-muted hover:bg-muted"
        >
          <FileText className="w-5 h-5" />
          View a demo
        </Link>
      </div>

      <div className="text-sm text-muted-foreground">
        Most teams create their first agent in under 3 minutes.
      </div>
    </div>
  );
}
