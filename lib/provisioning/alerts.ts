// lib/provisioning/alerts.ts
export async function sendProvisioningAlert(data: any): Promise<void> {
  console.log('Alert:', data);
}

export function resolveAlertTarget(): string {
  return process.env.ALERT_WEBHOOK_URL || '';
}
