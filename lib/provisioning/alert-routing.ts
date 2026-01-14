// lib/provisioning/alert-routing.ts

export type AlertTarget = {
  slackWebhook?: string;
  email?: string;
};

/**
 * Resolve where alerts should go based on project slug.
 * This keeps alert logic out of the orchestrator.
 */
export function resolveAlertTarget(
  projectSlug: string
): AlertTarget {
  // Demo / dev environments
  if (projectSlug.startsWith('demo-')) {
    return {
      slackWebhook: process.env.SLACK_WEBHOOK_DEV,
      email: process.env.ALERT_EMAIL_DEV,
    };
  }

  // Default: ops / production
  return {
    slackWebhook: process.env.SLACK_WEBHOOK_OPS,
    email: process.env.ALERT_EMAIL_OPS,
  };
}

