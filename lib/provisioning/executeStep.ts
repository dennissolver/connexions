// lib/provisioning/executeStep.ts
import { createGithubRepo } from './steps/github';
import {
  createSupabaseProject,
  isSupabaseReady,
  fetchSupabaseKeys,
  runSupabaseMigration,
  configureSupabaseAuth,
  createSupabaseBuckets,
} from './steps/supabase';
import {
  createVercelProject,
  triggerVercelDeployment,
} from './steps/vercel';
import {
  createStripeCustomer,
  createStripeSubscription,
} from './steps/stripe';
import { cleanupProvisioning } from './steps/cleanup';
import { ProvisionState } from './states';

const SCHEMA_SQL = '/* YOUR SCHEMA SQL HERE */';

export async function executeProvisionStep(
  state: ProvisionState,
  ctx: any
): Promise<{ nextState: ProvisionState | null; metadata?: any }> {
  try {
    const {
      projectSlug,
      publicBaseUrl,
      supabaseToken,
      supabaseOrgId,
      metadata,
    } = ctx;

    switch (state) {
      case 'INIT':
        return { nextState: 'GITHUB_CREATING' };

      case 'GITHUB_CREATING': {
        const { repoFullName } = await createGithubRepo(
          process.env.GITHUB_TOKEN!,
          projectSlug,
          process.env.GITHUB_ORG!
        );
        return {
          nextState: 'SUPABASE_CREATING',
          metadata: { repoFullName },
        };
      }

      case 'SUPABASE_CREATING': {
        const { projectRef } = await createSupabaseProject(
          supabaseToken,
          supabaseOrgId,
          projectSlug
        );
        return {
          nextState: 'SUPABASE_READY',
          metadata: { ...metadata, projectRef },
        };
      }

      case 'SUPABASE_READY': {
        const ready = await isSupabaseReady(
          supabaseToken,
          metadata.projectRef
        );
        return ready
          ? { nextState: 'SCHEMA_MIGRATED' }
          : { nextState: null };
      }

      case 'SCHEMA_MIGRATED': {
        const keys = await fetchSupabaseKeys(
          supabaseToken,
          metadata.projectRef
        );

        await runSupabaseMigration(
          supabaseToken,
          metadata.projectRef,
          SCHEMA_SQL
        );

        return {
          nextState: 'AUTH_CONFIGURED',
          metadata: {
            ...metadata,
            ...keys,
            supabaseUrl: `https://${metadata.projectRef}.supabase.co`,
          },
        };
      }

      case 'AUTH_CONFIGURED': {
        await configureSupabaseAuth(
          supabaseToken,
          metadata.projectRef,
          publicBaseUrl
        );
        return { nextState: 'STORAGE_READY' };
      }

      case 'STORAGE_READY': {
        await createSupabaseBuckets(
          metadata.supabaseUrl,
          metadata.serviceKey
        );
        return { nextState: 'VERCEL_CREATING' };
      }

      case 'VERCEL_CREATING': {
        const { projectId } = await createVercelProject(
          process.env.VERCEL_TOKEN!,
          projectSlug,
          metadata.repoFullName
        );
        return {
          nextState: 'VERCEL_DEPLOYING',
          metadata: { ...metadata, vercelProjectId: projectId },
        };
      }

      case 'VERCEL_DEPLOYING': {
        await triggerVercelDeployment(
          process.env.VERCEL_TOKEN!,
          metadata.vercelProjectId
        );
        return { nextState: 'STRIPE_CUSTOMER_CREATING' };
      }

      case 'STRIPE_CUSTOMER_CREATING': {
        const { customerId } = await createStripeCustomer(
          projectSlug
        );
        return {
          nextState: 'STRIPE_SUBSCRIPTION_CREATING',
          metadata: { ...metadata, stripeCustomerId: customerId },
        };
      }

      case 'STRIPE_SUBSCRIPTION_CREATING': {
        const { subscriptionId } =
          await createStripeSubscription(
            metadata.stripeCustomerId
          );
        return {
          nextState: 'COMPLETE',
          metadata: {
            ...metadata,
            stripeSubscriptionId: subscriptionId,
          },
        };
      }

      default:
        return { nextState: null };
    }
  } catch (err: any) {
    await cleanupProvisioning(ctx.metadata);
    throw err;
  }
}
``

