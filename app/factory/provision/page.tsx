'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type ProvisionStatus =
  | 'idle'
  | 'provisioning'
  | 'verifying'
  | 'ready'
  | 'failed';

export default function ProvisionPage() {
  const router = useRouter();

  const [status, setStatus] = useState<ProvisionStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const [agentId, setAgentId] = useState<string | null>(null);
  const [agentSlug, setAgentSlug] = useState<string | null>(null);

  // 🔑 Canonical URL — NEVER optional
  const [publicBaseUrl, setPublicBaseUrl] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // STEP 0 — Derive and lock publicBaseUrl
  // ---------------------------------------------------------------------------

  useEffect(() => {
    // This page only ever runs in the parent (Connexions)
    // The predicted child URL is deterministic at provision time
    const slug = new URLSearchParams(window.location.search).get('slug');

    if (!slug) {
      setError('Missing project slug');
      setStatus('failed');
      return;
    }

    const predictedUrl = `https://${slug}.vercel.app`;

    setAgentSlug(slug);
    setPublicBaseUrl(predictedUrl);
  }, []);

  // ---------------------------------------------------------------------------
  // STEP 1 — Start provisioning
  // ---------------------------------------------------------------------------

  async function startProvisioning(formData: any) {
    if (!publicBaseUrl || !agentSlug) {
      setError('Provisioning failed: publicBaseUrl not initialised');
      setStatus('failed');
      return;
    }

    try {
      setStatus('provisioning');

      // -----------------------------------------------------
      // 1️⃣ Create ElevenLabs agent (SETUP = authoritative)
      // -----------------------------------------------------

      const res = await fetch('/api/setup/create-elevenlabs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platformName: formData.platformName,
          projectSlug: agentSlug,
          agentName:
            formData.agentName ||
            (formData.voiceGender === 'male' ? 'Alex' : 'Sarah'),
          voiceGender: formData.voiceGender,

          // 🔥 REQUIRED & GUARANTEED
          publicBaseUrl,
        }),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg);
      }

      const data = await res.json();
      setAgentId(data.agentId);

      // Move immediately into verification
      setStatus('verifying');

    } catch (err: any) {
      console.error('[Provision] Failed:', err);
      setError(err.message || 'Provisioning failed');
      setStatus('failed');
    }
  }

  // ---------------------------------------------------------------------------
  // STEP 2 — Verify + reconcile deployment
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (status !== 'verifying' || !agentId || !publicBaseUrl) return;

    let cancelled = false;

    async function verify() {
      try {
        // Verify ElevenLabs agent exists
        const res = await fetch('/api/verify-agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentId }),
        });

        if (!res.ok) throw new Error('Verification failed');

        // OPTIONAL: reconcile actual deployment URL if available
        const actualDeploymentUrl =
          (window as any).__VERCEL_DEPLOYMENT_URL__;

        if (
          actualDeploymentUrl &&
          actualDeploymentUrl !== publicBaseUrl
        ) {
          // Persist corrected URL
          await fetch('/api/internal/update-agent-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              agentId,
              publicBaseUrl: actualDeploymentUrl,
            }),
          });

          if (!cancelled) {
            setPublicBaseUrl(actualDeploymentUrl);
          }
        }

        if (!cancelled) {
          setStatus('ready');
        }
      } catch (err) {
        console.warn(
          '[Provision] Agent detected, verifying anyway…'
        );
        if (!cancelled) {
          setStatus('verifying');
          setTimeout(verify, 3000); // retry loop
        }
      }
    }

    verify();

    return () => {
      cancelled = true;
    };
  }, [status, agentId, publicBaseUrl]);

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  if (status === 'idle' || status === 'provisioning') {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h2 className="text-2xl font-bold mb-4">
          Setting up your AI Interviewer
        </h2>
        <p className="text-slate-500">
          Please wait while we provision your platform…
        </p>
      </div>
    );
  }

  if (status === 'verifying') {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h2 className="text-2xl font-bold mb-4">
          Agent detected, verifying anyway…
        </h2>
        <p className="text-slate-500">
          Finalising deployment and connections.
        </p>
      </div>
    );
  }

  if (status === 'ready' && agentSlug && publicBaseUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h2 className="text-2xl font-bold mb-4">
          Your interview platform is ready
        </h2>

        <a
          href={`${publicBaseUrl}/interview/${agentSlug}`}
          className="px-6 py-3 bg-black text-white rounded"
        >
          Go to Interview Panel
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h2 className="text-2xl font-bold mb-4 text-red-600">
        Provisioning failed
      </h2>
      <p className="text-slate-500">{error}</p>
    </div>
  );
}
