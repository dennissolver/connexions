// lib/lifecycle/types.ts
export type TenantLifecycle =
  | 'VISITOR'
  | 'PAID_NO_PROFILE'
  | 'COMPANY_PROFILE_COMPLETE'
  | 'PERSONAL_PROFILE_COMPLETE'
  | 'AGENT_CONFIGURED'
  | 'INTERVIEW_PANEL_CREATED';
