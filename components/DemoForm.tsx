// components/DemoForm.tsx
'use client';

import { useState } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';

export default function DemoForm() {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    // Brief delay for UX feedback, then redirect to demo
    await new Promise(resolve => setTimeout(resolve, 500));
    window.location.href = 'https://connexion-demo-opal.vercel.app/';
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-neutral-400 mb-1">Your Name</label>
        <input
          name="name"
          required
          className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 focus:border-purple-500 focus:outline-none"
          placeholder="Jane Smith"
        />
      </div>
      <div>
        <label className="block text-sm text-neutral-400 mb-1">Company</label>
        <input
          name="company"
          required
          className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 focus:border-purple-500 focus:outline-none"
          placeholder="Acme Corp"
        />
      </div>
      <div>
        <label className="block text-sm text-neutral-400 mb-1">Email</label>
        <input
          name="email"
          type="email"
          required
          className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 focus:border-purple-500 focus:outline-none"
          placeholder="jane@acme.com"
        />
      </div>
      <div>
        <label className="block text-sm text-neutral-400 mb-1">Website (optional)</label>
        <input
          name="website"
          type="url"
          className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 focus:border-purple-500 focus:outline-none"
          placeholder="https://acme.com"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Starting...
          </>
        ) : (
          <>
            Start Free Demo
            <ArrowRight className="w-5 h-5" />
          </>
        )}
      </button>
    </form>
  );
}