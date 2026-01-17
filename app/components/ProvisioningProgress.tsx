import { PROVISION_UI, calculateProgress } from '@/lib/provisioning/registry';
import { ProvisionState } from '@/lib/provisioning/states';

export function ProvisioningProgress({ state }: { state: ProvisionState }) {
  const meta = PROVISION_UI[state];

  return (
    <div>
      <h3>{meta.title}</h3>
      <p>{meta.description}</p>

      <div className="h-2 bg-slate-800 rounded">
        <div
          className="h-2 bg-purple-500 rounded"
          style={{ width: `${calculateProgress(state)}%` }}
        />
      </div>
    </div>
  );
}
