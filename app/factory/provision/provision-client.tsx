// app/factory/provision/provision-client.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, Circle, Loader2, XCircle, Sparkles, Database, Github, Globe, Mic } from 'lucide-react';

interface ProvisionRun {
  id: string;
  project_slug: string;
  platform_name: string;
  company_name: string;
  state: string;
  metadata: Record<string, any>;
  error?: string;
}

const STEPS = [
  { state: 'INIT', label: 'Initializing', icon: Sparkles },
  { state: 'SUPABASE_CREATING', label: 'Creating database', icon: Database },
  { state: 'SUPABASE_READY', label: 'Database ready', icon: Database },
  { state: 'GITHUB_CREATING', label: 'Creating repository', icon: Github },
  { state: 'GITHUB_READY', label: 'Repository ready', icon: Github },
  { state: 'VERCEL_CREATING', label: 'Deploying to Vercel', icon: Globe },
  { state: 'VERCEL_DEPLOYING', label: 'Building...', icon: Globe },
  { state: 'VERCEL_READY', label: 'Deployment ready', icon: Globe },
  { state: 'AGENT_CREATING', label: 'Creating AI agent', icon: Mic },
  { state: 'AGENT_READY', label: 'Agent ready', icon: Mic },
  { state: 'COMPLETE', label: 'Complete!', icon: CheckCircle },
];

export default function ProvisionClient() {
  const router = useRouter();
  const params = useSearchParams();
  const projectSlug = params.get('projectSlug');

  const [run, setRun] = useState<ProvisionRun | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectSlug) {
      router.replace('/dashboard');
      return;
    }

    // Poll for status
    const poll = async () => {
      try {
        const res = await fetch(`/api/provision/status?projectSlug=${projectSlug}`);
        if (!res.ok) throw new Error('Failed to fetch status');
        const data = await res.json();
        setRun(data.run);

        if (data.run?.state === 'COMPLETE') {
          // Wait a moment then redirect
          setTimeout(() => router.push(data.run.metadata.vercelUrl || "/dashboard"), 2000);
        } else if (data.run?.state === 'FAILED') {
          setError(data.run.error || 'Provisioning failed');
        }
      } catch (err: any) {
        console.error('Poll error:', err);
      }
    };

    poll();
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [projectSlug, router]);

  if (!projectSlug) return null;

  const currentStepIndex = STEPS.findIndex(s => s.state === run?.state);

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-amber-50">
      {/* Header */}
      <div className="bg-white/70 backdrop-blur-sm border-b border-violet-100">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-violet-900">Connexions</span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="bg-white rounded-3xl shadow-xl shadow-violet-100/50 border border-violet-100 overflow-hidden p-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-400 to-fuchsia-400 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-200">
              {run?.state === 'COMPLETE' ? (
                <CheckCircle className="w-10 h-10 text-white" />
              ) : run?.state === 'FAILED' ? (
                <XCircle className="w-10 h-10 text-white" />
              ) : (
                <Loader2 className="w-10 h-10 text-white animate-spin" />
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              {run?.state === 'COMPLETE'
                ? 'Your platform is ready! 🎉'
                : run?.state === 'FAILED'
                ? 'Something went wrong'
                : 'Setting up your platform...'}
            </h1>
            {run?.platform_name && (
              <p className="text-gray-500 mt-2">{run.platform_name}</p>
            )}
          </div>

          {/* Progress Steps */}
          <div className="space-y-3">
            {STEPS.map((step, i) => {
              const isComplete = currentStepIndex > i;
              const isCurrent = currentStepIndex === i;
              const isPending = currentStepIndex < i;
              const Icon = step.icon;

              return (
                <div
                  key={step.state}
                  className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
                    isCurrent 
                      ? 'bg-violet-50 border-2 border-violet-200' 
                      : isComplete
                      ? 'bg-emerald-50 border border-emerald-100'
                      : 'bg-gray-50 border border-gray-100'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isComplete 
                      ? 'bg-emerald-500' 
                      : isCurrent
                      ? 'bg-violet-500'
                      : 'bg-gray-200'
                  }`}>
                    {isComplete ? (
                      <CheckCircle className="w-5 h-5 text-white" />
                    ) : isCurrent ? (
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    ) : (
                      <Icon className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className={`font-medium ${
                      isComplete ? 'text-emerald-700' : isCurrent ? 'text-violet-700' : 'text-gray-400'
                    }`}>
                      {step.label}
                    </div>
                  </div>
                  {isComplete && (
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Error */}
          {error && (
            <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4 text-red-600">
              <div className="font-medium mb-1">Error</div>
              <div className="text-sm">{error}</div>
            </div>
          )}

          {/* Metadata Preview */}
          {run?.metadata && run.metadata.vercelUrl && (
            <div className="mt-6 bg-gray-50 rounded-xl p-4">
              <div className="text-sm text-gray-500 mb-2">Your platform URL</div>
              <a
                href={run.metadata.vercelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-600 font-medium hover:underline"
              >
                {run.metadata.vercelUrl}
              </a>
            </div>
          )}
        </div>

        <p className="text-center text-gray-400 text-sm mt-8">
          This usually takes 1-2 minutes ✨
        </p>
      </div>
    </div>
  );
}
