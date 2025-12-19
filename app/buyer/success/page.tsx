// app/buyer/success/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Rocket, ArrowRight, Loader2, Mail } from 'lucide-react';

export default function SubscriptionSuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const leadId = searchParams.get('leadId');

  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customerEmail, setCustomerEmail] = useState<string | null>(null);

  useEffect(() => {
    if (sessionId) {
      // Verify the session with our backend
      fetch(`/api/stripe/verify-session?session_id=${sessionId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setVerified(true);
            setCustomerEmail(data.email);
          } else {
            setError(data.error || 'Could not verify payment');
          }
          setVerifying(false);
        })
        .catch(() => {
          setError('Could not verify payment');
          setVerifying(false);
        });
    } else {
      // No session ID, assume direct navigation
      setVerifying(false);
      setVerified(true);
    }
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
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
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
        {/* Success animation */}
        <div className="relative mb-8">
          <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto animate-pulse">
            <CheckCircle className="w-12 h-12 text-green-400" />
          </div>
          <div className="absolute inset-0 w-24 h-24 mx-auto rounded-full border-2 border-green-500/30 animate-ping" />
        </div>

        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Welcome to Connexions! 🎉
        </h1>

        <p className="text-slate-400 text-lg mb-8">
          Your subscription is active. We're setting up your private platform now.
        </p>

        {customerEmail && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 mb-8">
            <div className="flex items-center justify-center gap-3 text-slate-300">
              <Mail className="w-5 h-5 text-purple-400" />
              <span>Confirmation sent to <strong>{customerEmail}</strong></span>
            </div>
          </div>
        )}

        {/* What happens next */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 mb-8 text-left">
          <h2 className="font-semibold text-white mb-4">What happens next?</h2>
          <ol className="space-y-3 text-slate-400">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400 text-sm flex-shrink-0">1</span>
              <span>We'll provision your private database and platform</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400 text-sm flex-shrink-0">2</span>
              <span>You'll receive your admin credentials via email</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400 text-sm flex-shrink-0">3</span>
              <span>Start creating AI interview agents immediately</span>
            </li>
          </ol>
        </div>

        {/* CTA */}
        <Link
          href={`/factory/provision${leadId ? `?leadId=${leadId}` : ''}`}
          className="inline-flex items-center gap-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 px-8 py-4 rounded-xl font-semibold text-lg transition-all"
        >
          <Rocket className="w-5 h-5" />
          Continue to Platform Setup
          <ArrowRight className="w-5 h-5" />
        </Link>

        <p className="text-slate-500 text-sm mt-6">
          Typical setup time: 2-3 minutes
        </p>
      </div>
    </div>
  );
}