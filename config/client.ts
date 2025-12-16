// config/client.ts
// ============================================================================
// CLIENT CONFIGURATION
// Platform defaults & product identity
// (NOT tenant data, NOT runtime state)
// ============================================================================

/* ============================================================================
   TYPES
============================================================================ */

export type LLMProvider = "anthropic" | "openai" | "grok" | "gemini";

export interface LLMProviderConfig {
  enabled: boolean;
  defaultModel: string;
  models: readonly string[];
}

/* ============================================================================
   CLIENT CONFIG
============================================================================ */

export const clientConfig = {
  /* ==========================================================================
     PLATFORM IDENTITY (OPERATOR DEFAULTS)
     This describes who RUNS the platform, not who USES it
  ========================================================================== */
  platform: {
    name: "Connexions",
    tagline: "AI-Powered Research Interview Platform",
    description:
      "Conduct structured research interviews with AI assistance. Validate ideas, gather insights, and analyse results at scale.",
    version: "1.0.0",
  },

  company: {
    // Platform operator identity (default seed)
    name: "Corporate AI Solutions",
    legalName: "Global Buildtech Australia Pty Ltd",
    website: "https://corporateaisolutions.com",
    supportEmail: "dennis@corporateaisolutions.com",

    social: {
      linkedin: "https://linkedin.com/company/corporateaisolutions",
      twitter: "https://twitter.com/corpaisolutions",
    },
  },

  /* ==========================================================================
     INTERVIEW DEFAULTS
     Opinionated defaults — ALWAYS overridable per agent / interviews
  ========================================================================== */
  interview: {
    defaultPersona: `
You are professional, warm, and genuinely curious.
You are conducting research, not selling.
Your tone is conversational and respectful of the interviewee’s time.
You are here to learn and understand their perspective.
`.trim(),

    defaultConsent: [
      "I consent to this interviews being recorded and analysed",
      "I consent to anonymised quotes being used in research findings",
      "I understand I can stop the interviews at any time",
    ],

    timing: {
      maxDurationMins: 45,
      warningAtMins: 35,
    },

    /* ======================================================================
       AI / LLM DEFAULTS
       Claude is the default. Others are supported and switchable.
    ====================================================================== */
    ai: {
      defaultProvider: "anthropic" as LLMProvider,

      providers: {
        anthropic: {
          enabled: true,
          defaultModel: "claude-sonnet-4-20250514",
          models: [
            "claude-sonnet-4-20250514",
            "claude-opus-4-20250514",
          ],
        } satisfies LLMProviderConfig,

        openai: {
          enabled: true,
          defaultModel: "gpt-4o-mini",
          models: [
            "gpt-4o-mini",
            "gpt-4o",
          ],
        } satisfies LLMProviderConfig,

        grok: {
          enabled: true,
          defaultModel: "grok-2",
          models: ["grok-2"],
        } satisfies LLMProviderConfig,

        gemini: {
          enabled: true,
          defaultModel: "gemini-1.5-pro",
          models: ["gemini-1.5-pro"],
        } satisfies LLMProviderConfig,
      },

      maxTokens: 4096,
      temperature: 0.7,
    },
  },

  /* ==========================================================================
     THEME & BRANDING (UI DEFAULTS)
  ========================================================================== */
  theme: {
    mode: "dark" as "dark" | "light",
    colors: {
      primary: "#8B5CF6",
      primaryHover: "#7C3AED",
      accent: "#10B981",
      accentHover: "#059669",
      background: "#0F172A",
      surface: "#1E293B",
      text: "#F8FAFC",
      textMuted: "#94A3B8",
      border: "#334155",
      success: "#22C55E",
      warning: "#F59E0B",
      error: "#EF4444",
    },
  },

  /* ==========================================================================
     FEATURE FLAGS
     Used for gradual rollout & enterprise toggles
  ========================================================================== */
  features: {
    enableAnalytics: true,
    enableExport: true,
    enableVideoRecording: false,
    enableAudioRecording: false,
    enableRealTimeAnalysis: true,
    enableBatchAnalysis: true,
  },
} as const;

/* ============================================================================
   READ-ONLY HELPERS
   (Encourage consistent access, discourage hard-coding)
============================================================================ */

export const getPlatformInfo = () => clientConfig.platform;
export const getCompanyInfo = () => clientConfig.company;

export const getInterviewDefaults = () => clientConfig.interview;
export const getDefaultPersona = () => clientConfig.interview.defaultPersona;

export const getAIDefaults = () => clientConfig.interview.ai;

export const getDefaultLLMProvider = () =>
  clientConfig.interview.ai.defaultProvider;

export const getDefaultLLMModel = (provider?: LLMProvider) => {
  const resolvedProvider =
    provider ?? clientConfig.interview.ai.defaultProvider;

  return clientConfig.interview.ai.providers[resolvedProvider].defaultModel;
};

export const isFeatureEnabled = (
  feature: keyof typeof clientConfig.features
) => clientConfig.features[feature];

export type ClientConfig = typeof clientConfig;
