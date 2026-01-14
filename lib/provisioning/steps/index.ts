// lib/provisioning/steps/index.ts

import { ProvisionState } from '../states';
import { ProvisionContext, ProvisionStepResult } from '../types';

import { createSupabaseProject } from './createSupabaseProject';
import { createGithubRepo } from './createGithubRepo';
import { createVercelProject } from './createVercelProject';
import { configureElevenLabs } from './configureElevenLabs';
import { cleanup } from './cleanup';

type StepFn = (ctx: ProvisionContext) => Promise<ProvisionStepResult>;

export const STEPS: Record<ProvisionState, StepFn> = {
  INIT: createSupabaseProject,
  CREATE_PROJECT: createGithubRepo,
  APPLY_SCHEMA: createVercelProject,
  CONFIGURE_AUTH: configureElevenLabs,
  FINALISE: cleanup,
  COMPLETE: cleanup,
  FAILED: cleanup,
};
