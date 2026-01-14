// config/client.ts
// ============================================================================
// CLIENT CONFIGURATION
// Platform defaults & product identity
// This file is customized during setup for each client
// ============================================================================

export const clientConfig = {
  platform: {
    name: process.env.NEXT_PUBLIC_PLATFORM_NAME || "AI Interview Platform",
    tagline: "AI-Powered Research Interview Platform",
    description: "Conduct structured research interviews with AI assistance.",
    version: "1.0.0",
  },

  company: {
    name: process.env.NEXT_PUBLIC_COMPANY_NAME || "Your Company",
    website: "",
    supportEmail: "support@example.com",
  },

  theme: {
    mode: "dark" as "dark" | "light",
    colors: {
      primary: "#8B5CF6",
      accent: "#10B981",
      background: "#0F172A",
    },
  },

  features: {
    enableAnalytics: true,
    enableExport: true,
  },
} as const;

export const getPlatformInfo = () => clientConfig.platform;
export const getCompanyInfo = () => clientConfig.company;

export type ClientConfig = typeof clientConfig;

