// lib/provisioning/states.ts
export type ProvisionState =
  | 'INIT'
  | 'CREATE_PROJECT'
  | 'APPLY_SCHEMA'
  | 'CONFIGURE_AUTH'
  | 'FINALISE'
  | 'COMPLETE'
  | 'FAILED';

export const ALLOWED_TRANSITIONS: Record<ProvisionState, ProvisionState[]> = {
  INIT: ['CREATE_PROJECT'],
  CREATE_PROJECT: ['APPLY_SCHEMA', 'FAILED'],
  APPLY_SCHEMA: ['CONFIGURE_AUTH', 'FAILED'],
  CONFIGURE_AUTH: ['FINALISE', 'FAILED'],
  FINALISE: ['COMPLETE', 'FAILED'],
  COMPLETE: [],
  FAILED: [],
};
