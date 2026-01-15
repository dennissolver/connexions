// lib/lifecycle/resolveNextRoute.ts
import { TenantLifecycle } from './types';

export function resolveNextRoute(lifecycle: TenantLifecycle): string {
  switch (lifecycle) {
    case 'VISITOR':
      return '/';

    case 'PAID_NO_PROFILE':
      return '/setup/company';

    case 'COMPANY_PROFILE_COMPLETE':
      return '/setup/personal';

    case 'PERSONAL_PROFILE_COMPLETE':
      return '/setup/agent';

    case 'AGENT_CONFIGURED':
      return '/setup/interview';

    case 'INTERVIEW_PANEL_CREATED':
      return '/dashboard';

    default:
      return '/';
  }
}