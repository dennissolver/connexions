// lib/lifecycle/routes.ts
import { TenantLifecycle } from './types';

export const LIFECYCLE_ROUTES: Record<
  TenantLifecycle,
  {
    allowed: string[];
    next: string;
  }
> = {
  VISITOR: {
    allowed: ['/'],
    next: '/buy',
  },

  PAID_NO_PROFILE: {
    allowed: ['/dashboard'],
    next: '/setup/company',
  },

  COMPANY_PROFILE_COMPLETE: {
    allowed: ['/setup/personal'],
    next: '/setup/personal',
  },

  PERSONAL_PROFILE_COMPLETE: {
    allowed: ['/setup/agent'],
    next: '/setup/agent',
  },

  AGENT_CONFIGURED: {
    allowed: ['/interview/setup'],
    next: '/interview/setup',
  },

  INTERVIEW_PANEL_CREATED: {
    allowed: ['/dashboard', '/interview'],
    next: '/dashboard',
  },
};
