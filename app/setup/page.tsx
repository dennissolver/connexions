// app/setup/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, User, Sparkles, ChevronRight, ChevronLeft, Mic, Check } from "lucide-react";

type SetupData = {
  platformName: string;
  companyName: string;
  contactEmail: string;
  ownerName: string;
  ownerRole: string;
  voicePreference: "maya" | "adam";
};

const initialData: SetupData = {
  platformName: "",
  companyName: "",
  contactEmail: "",
  ownerName: "",
  ownerRole: "",
  voicePreference: "maya",
};

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<SetupData>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof SetupData>(key: K, value: SetupData[K]) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  function canProceed() {
    if (step === 1) {
      return data.platformName && data.companyName && data.contactEmail;
    }
    if (step === 2) {
      return data.ownerName && data.ownerRole;
    }
    return true;
  }

  function next() {
    if (!canProceed()) return;
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
      const res = await fetch("/api/setup/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to start provisioning");
      }

      const { projectSlug } = await res.json();
      router.push(`/factory/provision?projectSlug=${projectSlug}`);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setLoading(false);
    }
  }

  const steps = [
    { num: 1, label: "Company", icon: Building2 },
    { num: 2, label: "You", icon: User },
    { num: 3, label: "Launch", icon: Sparkles },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-amber-50">
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
        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-12">
          {steps.map((s, i) => (
            <div key={s.num} className="flex items-center">
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                  step === s.num
                    ? "bg-violet-500 text-white shadow-lg shadow-violet-200"
                    : step > s.num
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {step > s.num ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <s.icon className="w-4 h-4" />
                )}
                <span className="text-sm font-medium">{s.label}</span>
              </div>
              {i < steps.length - 1 && (
                <ChevronRight className={`w-4 h-4 mx-1 ${step > s.num ? "text-emerald-400" : "text-gray-300"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-violet-100/50 border border-violet-100 overflow-hidden">
          {/* STEP 1 — COMPANY */}
          {step === 1 && (
            <div className="p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-400 to-fuchsia-400 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-200">
                  <Building2 className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Let's set up your platform!</h1>
                <p className="text-gray-500 mt-2">First, tell us about your company</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Platform Name</label>
                  <input
                    placeholder="e.g., Acme Research Hub"
                    value={data.platformName}
                    onChange={(e) => update("platformName", e.target.value)}
                    className="w-full rounded-xl bg-gray-50 border-2 border-gray-100 px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-violet-400 focus:bg-white focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
                  <input
                    placeholder="e.g., Acme Inc."
                    value={data.companyName}
                    onChange={(e) => update("companyName", e.target.value)}
                    className="w-full rounded-xl bg-gray-50 border-2 border-gray-100 px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-violet-400 focus:bg-white focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contact Email</label>
                  <input
                    type="email"
                    placeholder="you@company.com"
                    value={data.contactEmail}
                    onChange={(e) => update("contactEmail", e.target.value)}
                    className="w-full rounded-xl bg-gray-50 border-2 border-gray-100 px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-violet-400 focus:bg-white focus:outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 — PERSONAL */}
          {step === 2 && (
            <div className="p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-200">
                  <User className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Nice to meet you!</h1>
                <p className="text-gray-500 mt-2">Tell us a bit about yourself</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Your Name</label>
                  <input
                    placeholder="e.g., Sarah Johnson"
                    value={data.ownerName}
                    onChange={(e) => update("ownerName", e.target.value)}
                    className="w-full rounded-xl bg-gray-50 border-2 border-gray-100 px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-amber-400 focus:bg-white focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Your Role</label>
                  <input
                    placeholder="e.g., Head of Research"
                    value={data.ownerRole}
                    onChange={(e) => update("ownerRole", e.target.value)}
                    className="w-full rounded-xl bg-gray-50 border-2 border-gray-100 px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-amber-400 focus:bg-white focus:outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3 — VOICE & CONFIRM */}
          {step === 3 && (
            <div className="p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-400 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-200">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Almost there!</h1>
                <p className="text-gray-500 mt-2">Choose your interview voice & launch</p>
              </div>

              {/* Voice Selection */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-3">Default Interview Voice</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => update("voicePreference", "maya")}
                    className={`relative p-6 rounded-2xl border-2 transition-all ${
                      data.voicePreference === "maya"
                        ? "border-fuchsia-400 bg-fuchsia-50"
                        : "border-gray-100 bg-gray-50 hover:border-gray-200"
                    }`}
                  >
                    {data.voicePreference === "maya" && (
                      <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-fuchsia-500 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-fuchsia-400 to-pink-400 flex items-center justify-center mx-auto mb-3">
                      <Mic className="w-6 h-6 text-white" />
                    </div>
                    <div className="font-semibold text-gray-900">Maya</div>
                    <div className="text-sm text-gray-500">Warm & friendly</div>
                  </button>

                  <button
                    onClick={() => update("voicePreference", "adam")}
                    className={`relative p-6 rounded-2xl border-2 transition-all ${
                      data.voicePreference === "adam"
                        ? "border-blue-400 bg-blue-50"
                        : "border-gray-100 bg-gray-50 hover:border-gray-200"
                    }`}
                  >
                    {data.voicePreference === "adam" && (
                      <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-400 flex items-center justify-center mx-auto mb-3">
                      <Mic className="w-6 h-6 text-white" />
                    </div>
                    <div className="font-semibold text-gray-900">Adam</div>
                    <div className="text-sm text-gray-500">Clear & professional</div>
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-3 text-center">You can change this later or choose per interview panel</p>
              </div>

              {/* Summary */}
              <div className="bg-gradient-to-br from-gray-50 to-violet-50 rounded-2xl p-6 border border-violet-100">
                <h3 className="font-semibold text-gray-900 mb-4">Your Platform Summary</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Platform</span>
                    <span className="font-medium text-gray-900">{data.platformName || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Company</span>
                    <span className="font-medium text-gray-900">{data.companyName || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Contact</span>
                    <span className="font-medium text-gray-900">{data.contactEmail || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Owner</span>
                    <span className="font-medium text-gray-900">{data.ownerName || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Voice</span>
                    <span className="font-medium text-gray-900">{data.voicePreference === "maya" ? "Maya" : "Adam"}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mx-8 mb-4 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 flex justify-between">
            {step > 1 ? (
              <button
                onClick={back}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-gray-600 hover:bg-gray-100 transition-all font-medium"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <button
                onClick={next}
                disabled={!canProceed()}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-semibold shadow-lg shadow-violet-200 hover:shadow-xl hover:shadow-violet-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={createPlatform}
                disabled={loading}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold shadow-lg shadow-emerald-200 hover:shadow-xl hover:shadow-emerald-300 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Launch My Platform
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-400 text-sm mt-8">
          Your platform will be ready in about 2 minutes ✨
        </p>
      </div>
    </main>
  );
}