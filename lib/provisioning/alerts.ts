// lib/provisioning/alerts.ts
import { Resend } from 'resend';
import { resolveAlertTarget } from '@/lib/provisioning/alert-routing';


const resend = new Resend(process.env.RESEND_API_KEY!);

export async function sendProvisioningAlert(params: {
  projectSlug: string;
  state: string;
  error: string;
  metadata?: any;
}) {
  const target = resolveAlertTarget(params.projectSlug);

  await Promise.allSettled([
    target.slackWebhook
      ? sendSlack(target.slackWebhook, params)
      : null,
    target.email
      ? sendEmail(target.email, params)
      : null,
  ]);
}

async function sendSlack(
  webhook: string,
  { projectSlug, state, error }: any
) {
  await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: `ðŸš¨ *Provisioning Failed*
â€¢ Project: *${projectSlug}*
â€¢ State: \`${state}\`
â€¢ Error: \`${error}\``,
    }),
  });
}

async function sendEmail(
  to: string,
  { projectSlug, state, error }: any
) {
  await resend.emails.send({
    from: 'Connexions Alerts <alerts@connexions.ai>',
    to,
    subject: `Provisioning FAILED â€“ ${projectSlug}`,
    html: `
      <h2>Provisioning Failed</h2>
      <p><strong>Project:</strong> ${projectSlug}</p>
      <p><strong>State:</strong> ${state}</p>
      <pre>${error}</pre>
    `,
  });
}

