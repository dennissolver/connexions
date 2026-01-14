// app/demo/complete/page.tsx
'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle, Rocket, Clock, Target, TrendingUp, Shield,
  Mic, Database, Users, BarChart3, ArrowRight, Sparkles,
  Building2, Zap, Globe, Lock, RefreshCw, DollarSign
} from 'lucide-react';

function DemoCompleteContent() {
  const searchParams = useSearchParams();
  const leadId = searchParams.get('leadId');
  
  const [leadData, setLeadData] = useState<any>(null);

  useEffect(() => {
    if (leadId) {
      fetch(`/api/demo/status/${leadId}`)
        .then(res => res.json())
        .then(data => setLeadData(data))
        .catch(() => {});
    }
  }, [leadId]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Hero - Thank You */}
      <div className="py-16 px-6 border-b border-slate-800">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/20">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            You Just Experienced the Future
          </h1>
          <p className="text-xl text-slate-400 mb-6 max-w-2xl mx-auto">
            That AI interview you just had? Imagine every candidate going through the same 
            consistent, professional screening â€” automatically.
          </p>

          {leadData && (
            <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 rounded-full px-5 py-2">
              <Building2 className="w-4 h-4 text-purple-400" />
              <span className="text-purple-300">
                Ready to build this for <strong>{leadData.company || 'your company'}</strong>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* What You Just Experienced */}
      <div className="py-12 px-6 border-b border-slate-800 bg-slate-900/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">What You Just Experienced</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 text-center">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Mic className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="font-semibold mb-2">Natural Conversation</h3>
              <p className="text-sm text-slate-400">
                AI that listens, responds, and adapts in real-time â€” just like a human interviewer.
              </p>
            </div>
            
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 text-center">
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Clock className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="font-semibold mb-2">Zero Scheduling</h3>
              <p className="text-sm text-slate-400">
                Available 24/7. Candidates interview when it suits them, not when you're free.
              </p>
            </div>
            
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 text-center">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Target className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="font-semibold mb-2">Consistent Standards</h3>
              <p className="text-sm text-slate-400">
                Every candidate gets the exact same fair evaluation. No bias, no bad days.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* The Problem You're Solving */}
      <div className="py-12 px-6 border-b border-slate-800">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">The Problem With Traditional Screening</h2>
          
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { problem: '30-60 min per candidate', pain: 'Multiplied by dozens of applicants' },
              { problem: 'Scheduling nightmares', pain: 'Back-and-forth emails, timezone confusion' },
              { problem: 'Inconsistent evaluations', pain: 'Different interviewers, different standards' },
              { problem: 'No-shows waste time', pain: '20-30% of candidates ghost interviews' },
              { problem: 'Interviewer fatigue', pain: 'Quality drops after the 5th call' },
              { problem: 'Can\'t scale hiring', pain: 'Limited by interviewer availability' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-4 bg-red-500/5 border border-red-500/20 rounded-lg">
                <div className="w-6 h-6 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-red-400 text-xs font-bold">âœ•</span>
                </div>
                <div>
                  <div className="font-medium text-red-300">{item.problem}</div>
                  <div className="text-sm text-slate-500">{item.pain}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Your Platform Solves This */}
      <div className="py-12 px-6 border-b border-slate-800 bg-gradient-to-b from-slate-900/50 to-transparent">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold mb-3">Your Platform Solves All of This</h2>
            <p className="text-slate-400">Everything you just experienced, branded for your company</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { 
                icon: Clock, 
                title: 'Save 10+ Hours Per Hire', 
                desc: 'AI screens candidates automatically. You only talk to the qualified ones.',
                color: 'green'
              },
              { 
                icon: TrendingUp, 
                title: 'Scale Instantly', 
                desc: 'Interview 10 or 1,000 candidates. Your AI never gets tired.',
                color: 'blue'
              },
              { 
                icon: Shield, 
                title: 'Consistent Quality', 
                desc: 'Every candidate evaluated against the same criteria. Fair and unbiased.',
                color: 'purple'
              },
              { 
                icon: Zap, 
                title: '24/7 Availability', 
                desc: 'Candidates interview on their schedule. No more timezone juggling.',
                color: 'orange'
              },
              { 
                icon: BarChart3, 
                title: 'Real Analytics', 
                desc: 'See exactly how candidates perform. Data-driven hiring decisions.',
                color: 'cyan'
              },
              { 
                icon: RefreshCw, 
                title: 'Drift Detection', 
                desc: 'AI monitors agent performance. Alerts if quality drops.',
                color: 'pink'
              },
            ].map((item, i) => {
              const colorClasses: Record<string, string> = {
                green: 'bg-green-500/20 text-green-400',
                blue: 'bg-blue-500/20 text-blue-400',
                purple: 'bg-purple-500/20 text-purple-400',
                orange: 'bg-orange-500/20 text-orange-400',
                cyan: 'bg-cyan-500/20 text-cyan-400',
                pink: 'bg-pink-500/20 text-pink-400',
              };
              return (
                <div key={i} className="flex items-start gap-4 p-5 bg-slate-800/30 border border-slate-700/50 rounded-xl">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClasses[item.color]}`}>
                    <item.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{item.title}</h3>
                    <p className="text-sm text-slate-400">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* What You Get */}
      <div className="py-12 px-6 border-b border-slate-800">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">What's Included</h2>
          
          <div className="space-y-4">
            {[
              { icon: Database, text: 'Your own database â€” all interview data belongs to you' },
              { icon: Mic, text: 'Unlimited AI interview agents with custom voices' },
              { icon: Users, text: '100 interviews per month included' },
              { icon: Globe, text: 'Your own deployment with custom domain option' },
              { icon: BarChart3, text: 'Full analytics dashboard with exports' },
              { icon: Shield, text: 'Automatic evaluation and drift detection' },
              { icon: Lock, text: 'Private GitHub repository â€” full source code' },
              { icon: Sparkles, text: 'Setup in 3 minutes, cancel anytime' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-4 p-4 bg-slate-900 border border-slate-800 rounded-lg">
                <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-5 h-5 text-green-400" />
                </div>
                <span className="text-slate-300">{item.text}</span>
                <CheckCircle className="w-5 h-5 text-green-500 ml-auto flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="py-12 px-6 border-b border-slate-800 bg-slate-900/50">
        <div className="max-w-xl mx-auto">
          <div className="bg-gradient-to-b from-slate-800 to-slate-800/50 border border-slate-700 rounded-2xl p-8 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-blue-500"></div>
            
            <h2 className="text-xl font-bold mb-6">Simple, Transparent Pricing</h2>
            
            <div className="flex items-baseline justify-center gap-2 mb-2">
              <span className="text-5xl font-bold">$150</span>
              <span className="text-slate-400 text-xl">/month</span>
            </div>
            <p className="text-slate-400 mb-6">100 interviews included Â· $4 per additional</p>
            
            <div className="flex items-center justify-center gap-6 text-sm text-slate-400 mb-8">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-400" />
                <span>No setup fees</span>
              </div>
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-green-400" />
                <span>Cancel anytime</span>
              </div>
            </div>
            
            <Link
              href={`/buyer${leadId ? `?leadId=${leadId}` : ''}`}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 py-4 rounded-xl font-semibold text-lg transition-all hover:scale-[1.02] shadow-lg shadow-purple-500/20"
            >
              <Rocket className="w-5 h-5" />
              Get Your Platform
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>

      {/* ROI Calculator */}
      <div className="py-12 px-6 border-b border-slate-800">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-8">The Math is Simple</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <div className="text-3xl font-bold text-red-400 mb-2">$50-100</div>
              <div className="text-sm text-slate-400">Traditional cost per screening</div>
              <div className="text-xs text-slate-500 mt-2">Recruiter time + scheduling + no-shows</div>
            </div>
            
            <div className="flex items-center justify-center">
              <div className="text-4xl font-bold text-slate-600">â†’</div>
            </div>
            
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6">
              <div className="text-3xl font-bold text-green-400 mb-2">$1.50-4</div>
              <div className="text-sm text-slate-400">Your cost with AI platform</div>
              <div className="text-xs text-green-500 mt-2">95% reduction</div>
            </div>
          </div>
          
          <p className="text-slate-500 text-sm mt-8">
            At 100 candidates/month, save $5,000-10,000 vs manual screening
          </p>
        </div>
      </div>

      {/* Final CTA */}
      <div className="py-16 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Hiring?</h2>
          <p className="text-slate-400 mb-8">
            Get your own AI interview platform. Same experience you just had, 
            branded for {leadData?.company || 'your company'}.
          </p>

          <Link
            href={`/buyer${leadId ? `?leadId=${leadId}` : ''}`}
            className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 px-10 py-4 rounded-xl font-semibold text-lg transition-all hover:scale-[1.02] shadow-lg shadow-purple-500/20"
          >
            <Rocket className="w-5 h-5" />
            Create My Platform â€” $150/month
            <ArrowRight className="w-5 h-5" />
          </Link>

          <p className="text-sm text-slate-500 mt-6">
            Questions? Contact Dennis at{' '}
            <a href="mailto:dennis@corporateaisolutions.com" className="text-purple-400 hover:underline">
              dennis@corporateaisolutions.com
            </a>
            {' '}or{' '}
            <a href="https://wa.me/61402612471" className="text-green-400 hover:underline">
              WhatsApp
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function DemoCompletePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    }>
      <DemoCompleteContent />
    </Suspense>
  );
}
