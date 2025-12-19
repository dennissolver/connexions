// app/buyer/BuyerClient.tsx

'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle, Rocket, CreditCard, Shield,
  BarChart3, Users, Mic, ArrowRight, Loader2,
  Building2, Globe, Database, Palette, Headphones
} from 'lucide-react';

export default function BuyerClient() {
  const searchParams = useSearchParams();
  const leadId = searchParams.get('leadId');

  const [leadData, setLeadData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state for new customers
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');

  useEffect(() => {
    if (leadId) {
      fetch(`/api/demo/status/${leadId}`)
        .then(res => res.json())
        .then(data => {
          setLeadData(data);
          if (data.email) setEmail(data.email);
          if (data.company) setCompanyName(data.company);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [leadId]);

  const handleCheckout = async () => {
    if (!email || !companyName) {
      setError('Please enter your email and company name');
      return;
    }

    setCheckoutLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          email,
          companyName,
          platformSlug: companyName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        }),
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
        setCheckoutLoading(false);
        return;
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      }

    } catch (err: any) {
      setError(err.message || 'Failed to start checkout');
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white py-12 px-6">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-purple-500/25">
            <Rocket className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Your Private AI Interview Platform
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Launch your own branded Connexions platform. Fully private, your own database,
            your domain, your brand. Ready in minutes.
          </p>
        </div>

        {/* Returning customer banner */}
        {leadData && !loading && (
          <div className="bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/30 rounded-xl p-6 mb-8">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0" />
              <p className="text-purple-200">
                Welcome back! We&apos;ll configure your platform for{' '}
                <strong className="text-white">{leadData.company || 'your company'}</strong>
                {' '}using your trial preferences.
              </p>
            </div>
          </div>
        )}

        {/* Main pricing card */}
        <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-3xl p-8 md:p-10 mb-8">

          {/* Price */}
          <div className="text-center mb-8">
            <div className="inline-flex items-baseline gap-1">
              <span className="text-slate-400 text-2xl">US</span>
              <span className="text-6xl font-bold">$150</span>
              <span className="text-slate-400 text-xl">/month</span>
            </div>
            <p className="text-slate-500 mt-2">Cancel anytime • No setup fees</p>
          </div>

          {/* What's included */}
          <div className="grid md:grid-cols-2 gap-6 mb-10">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Platform Features</h3>
              <div className="space-y-3">
                <Feature icon={Building2} text="Your own private platform" />
                <Feature icon={Database} text="Dedicated secure database" />
                <Feature icon={Globe} text="Custom domain support" />
                <Feature icon={Palette} text="Branded to your company style" />
                <Feature icon={Mic} text="Unlimited interview agents" />
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Included Monthly</h3>
              <div className="space-y-3">
                <Feature icon={Users} text="100 interviews included" highlight />
                <Feature icon={BarChart3} text="Analytics dashboard" />
                <Feature icon={Shield} text="Drift detection & scoring" />
                <Feature icon={Headphones} text="Full setup assistance" />
                <Feature icon={CreditCard} text="$5 per extra interview" subtle />
              </div>
            </div>
          </div>

          {/* Overage explanation */}
          <div className="bg-slate-800/50 rounded-xl p-4 mb-8 text-sm text-slate-400">
            <p>
              <strong className="text-slate-300">Usage billing:</strong> Your first 100 interviews each month are included.
              Additional interviews are billed at $5 each in arrears with your next monthly payment.
            </p>
          </div>

          {/* Form fields for new customers */}
          {!leadData && (
            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Work Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Company Name
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Acme Research Inc"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>
          )}

          {/* For returning customers, show pre-filled info */}
          {leadData && (
            <div className="space-y-4 mb-8">
              <div className="bg-slate-800/50 rounded-xl p-4">
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">Email:</span>
                    <span className="ml-2 text-white">{leadData.email}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Company:</span>
                    <span className="ml-2 text-white">{leadData.company}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* CTA Button */}
          <button
            onClick={handleCheckout}
            disabled={checkoutLoading}
            className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed py-4 rounded-xl font-semibold text-lg transition-all duration-200 shadow-lg shadow-purple-500/25"
          >
            {checkoutLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Connecting to payment...
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                Subscribe & Create My Platform
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>

          {/* Security note */}
          <p className="text-center text-slate-500 text-sm mt-4">
            🔒 Secure payment via Stripe. Your card details never touch our servers.
          </p>
        </div>

        {/* FAQ or additional info */}
        <div className="text-center text-slate-500 text-sm">
          <p>
            Questions? Email us at{' '}
            <a href="mailto:support@connexions.ai" className="text-purple-400 hover:text-purple-300">
              support@connexions.ai
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

function Feature({
  icon: Icon,
  text,
  highlight = false,
  subtle = false
}: {
  icon: any;
  text: string;
  highlight?: boolean;
  subtle?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
        highlight 
          ? 'bg-green-500/20' 
          : subtle 
            ? 'bg-slate-700/50' 
            : 'bg-purple-500/20'
      }`}>
        <Icon className={`w-4 h-4 ${
          highlight 
            ? 'text-green-400' 
            : subtle 
              ? 'text-slate-400' 
              : 'text-purple-400'
        }`} />
      </div>
      <span className={subtle ? 'text-slate-400' : 'text-slate-200'}>{text}</span>
    </div>
  );
}