// app/setup/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type SetupData = {
  platformName: string;
  companyName: string;
  publicUrl: string;
  contactEmail: string;

  ownerName: string;
  ownerRole: string;

  agentName: string;
  agentPurpose: string;
};

const initialData: SetupData = {
  platformName: "",
  companyName: "",
  publicUrl: "",
  contactEmail: "",

  ownerName: "",
  ownerRole: "",

  agentName: "",
  agentPurpose: "",
};

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<SetupData>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof SetupData>(key: K, value: string) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  function next() {
    setError(null);
    setStep((s) => s + 1);
  }

  function back() {
    setError(null);
    setStep((s) => s - 1);
  }

  async function createPlatform() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/setup/start-provisioning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        throw new Error("Failed to start provisioning");
      }

      const { platformId } = await res.json();
      router.push(`/factory/provision?platformId=${platformId}`);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="max-w-2xl mx-auto px-6 py-16 space-y-8">

        {/* HEADER */}
        <div>
          <h1 className="text-3xl font-semibold">Set up your platform</h1>
          <p className="text-neutral-400 mt-2">
            Step {step} of 4
          </p>
        </div>

        {/* STEP 1 — PLATFORM */}
        {step === 1 && (
          <div className="space-y-4">
            <input
              placeholder="Platform name"
              value={data.platformName}
              onChange={(e) => update("platformName", e.target.value)}
              className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-4 py-3"
            />
            <input
              placeholder="Company name"
              value={data.companyName}
              onChange={(e) => update("companyName", e.target.value)}
              className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-4 py-3"
            />
            <input
              placeholder="Public website URL"
              value={data.publicUrl}
              onChange={(e) => update("publicUrl", e.target.value)}
              className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-4 py-3"
            />
            <input
              type="email"
              placeholder="Primary contact email"
              value={data.contactEmail}
              onChange={(e) => update("contactEmail", e.target.value)}
              className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-4 py-3"
            />
          </div>
        )}

        {/* STEP 2 — PERSONAL */}
        {step === 2 && (
          <div className="space-y-4">
            <input
              placeholder="Your name"
              value={data.ownerName}
              onChange={(e) => update("ownerName", e.target.value)}
              className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-4 py-3"
            />
            <input
              placeholder="Your role"
              value={data.ownerRole}
              onChange={(e) => update("ownerRole", e.target.value)}
              className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-4 py-3"
            />
          </div>
        )}

        {/* STEP 3 — AGENT */}
        {step === 3 && (
          <div className="space-y-4">
            <input
              placeholder="Agent name"
              value={data.agentName}
              onChange={(e) => update("agentName", e.target.value)}
              className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-4 py-3"
            />
            <textarea
              placeholder="What should this agent do?"
              value={data.agentPurpose}
              onChange={(e) => update("agentPurpose", e.target.value)}
              className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-4 py-3 min-h-[120px]"
            />
          </div>
        )}

        {/* STEP 4 — CONFIRM */}
        {step === 4 && (
          <div className="space-y-4">
            <pre className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 text-sm overflow-auto">
{JSON.stringify(data, null, 2)}
            </pre>
            <p className="text-neutral-400 text-sm">
              Review your details. This will create your platform and begin provisioning.
            </p>
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* ACTIONS */}
        <div className="flex justify-between pt-4">
          {step > 1 ? (
            <button
              onClick={back}
              className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 transition"
            >
              Back
            </button>
          ) : <div />}

          {step < 4 ? (
            <button
              onClick={next}
              className="px-6 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 transition font-semibold"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={createPlatform}
              disabled={loading}
              className="px-6 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 transition font-semibold disabled:opacity-50"
            >
              {loading ? "Creating…" : "Create platform"}
            </button>
          )}
        </div>

      </div>
    </main>
  );
}
