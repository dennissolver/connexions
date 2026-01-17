// app/components/ProvisioningProgress.tsx

import { getServiceUiMeta, calculateOverallProgress, SERVICE_UI } from '@/lib/provisioning/registry';
import { ServiceStates, ServiceName } from '@/lib/provisioning';

const SERVICE_ORDER: ServiceName[] = ['supabase', 'github', 'vercel', 'sandra', 'kira', 'webhooks'];

export function ProvisioningProgress({ services }: { services: ServiceStates }) {
  const progress = calculateOverallProgress(services);

  return (
    <div className="space-y-4">
      {/* Overall progress bar */}
      <div className="h-2 bg-slate-800 rounded">
        <div
          className="h-2 bg-purple-500 rounded transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Per-service status */}
      <div className="space-y-2">
        {SERVICE_ORDER.map((service) => {
          const state = services[service];
          const meta = getServiceUiMeta(service, state);

          return (
            <div key={service} className="flex items-center justify-between text-sm">
              <span className="font-medium">{meta.title}</span>
              <span className={
                state === 'READY' ? 'text-green-400' :
                state === 'FAILED' ? 'text-red-400' :
                state === 'WAITING' ? 'text-yellow-400' :
                'text-slate-400'
              }>
                {meta.description}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}