// lib/provisioning/uiSteps.ts

import { ProvisionState } from './states';

export const PROVISION_UI: Record<
  ProvisionState,
  { title: string; description: string }
> = {
  INIT: {
    title: 'Starting setup',
    description: 'Preparing your platform…',
  },
  CREATE_PROJECT: {
    title: 'Creating project',
    description: 'Provisioning core infrastructure…',
  },
  APPLY_SCHEMA: {
    title: 'Applying schema',
    description: 'Configuring database structure…',
  },
  CONFIGURE_AUTH: {
    title: 'Configuring authentication',
    description: 'Securing access and permissions…',
  },
  FINALISE: {
    title: 'Finalising',
    description: 'Wrapping things up…',
  },
  COMPLETE: {
    title: 'Complete',
    description: 'Your platform is ready.',
  },
  FAILED: {
    title: 'Failed',
    description: 'Something went wrong.',
  },
};
