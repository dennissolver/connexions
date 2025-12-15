// config/site.ts
// ============================================================================
// SITE & SEO CONFIGURATION
// Web-facing metadata only (no business logic)
// ============================================================================

import { clientConfig } from "./client";

export const siteConfig = {
  // Product identity (single source of truth)
  name: clientConfig.platform.name,
  description: clientConfig.platform.description,

  // Canonical URL
  url:
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000",

  // Open Graph / Social
  ogImage: "/og.png",

  // External links
  links: {
    github: "https://github.com/raiseready/connexions",
  },
} as const;

export type SiteConfig = typeof siteConfig;
