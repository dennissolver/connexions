'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Rocket, ArrowRight, Loader2, Mail } from 'lucide-react';

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const leadId = searchParams.get('leadId');

  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customerEmail, setCustomerEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setVerifying(false);
      return;
    }

    fetch(`/api/stripe/verify-session?session_id=${sessionId}`)
      .then(res => res.json())
      .then(data => {
        if (!data.success) {
          setError(data.error || 'Could not verify payment');
        } else {
          setCustomerEmail(data.email);
        }
        setVerifying(false);
      })
      .catch(() => {
        setError('Could not verify payment');
        setVerifying(false);
      });
  }, [sessionId]);

  if (verifying) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Verifying your subscription...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
          <p className="text-slate-400 mb-6">{error}</p>
          <Link
            href={`/buyer${leadId ? `?leadId=${leadId}` : ''}`}
            className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300"
          >
            <ArrowRight className="w-4 h-4 rotate-180" />
            Try again
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
      <div className="max-w-lg text-center">
        <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-8">
          <CheckCircle className="w-12 h-12 text-green-400" />
        </div>

        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Welcome to Connexions 🎉
        </h1>

        <p className="text-slate-400 text-lg mb-8">
          Your subscription is active. Let’s finish setting up your platform.
        </p>

        {customerEmail && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 mb-8">
            <div className="flex items-center justify-center gap-3 text-slate-300">
              <Mail className="w-5 h-5 text-purple-400" />
              <span>
                Confirmation sent to <strong>{customerEmail}</strong>
              </span>
            </div>
          </div>
        )}

        <Link
          href={`/setup${leadId ? `?leadId=${leadId}` : ''}`}
          className="inline-flex items-center gap-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 px-8 py-4 rounded-xl font-semibold text-lg transition-all"
        >
          <Rocket className="w-5 h-5" />
          Continue Setup
          <ArrowRight className="w-5 h-5" />
        </Link>
      </div>
    </div>
  );
}

export default function SubscriptionSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
