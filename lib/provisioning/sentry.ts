// lib/provisioning/sentry.ts
import * as Sentry from '@sentry/nextjs';

/**
 * Initialise Sentry once at module load.
 * Safe to call in server environments.
 */
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});

/**
 * Capture provisioning-related errors with context.
 */
export function captureProvisioningError(params: {
  projectSlug: string;
  state: string;
  error: unknown;
  metadata?: any;
}) {
  Sentry.withScope(scope => {
    scope.setTag('project', params.projectSlug);
    scope.setTag('state', params.state);

    if (params.metadata) {
      scope.setContext('metadata', params.metadata);
    }

    if (params.error instanceof Error) {
      Sentry.captureException(params.error);
    } else {
      Sentry.captureMessage(
        `Non-error thrown in provisioning: ${String(params.error)}`
      );
    }
  });
}


