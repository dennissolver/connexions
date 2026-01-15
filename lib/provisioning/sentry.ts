// lib/provisioning/sentry.ts
export function captureProvisioningError(data: any): void {
  console.error('Sentry:', data);
}
