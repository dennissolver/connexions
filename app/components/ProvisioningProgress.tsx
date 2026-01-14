import { PROVISION_UI } from '@/lib/provisioning/uiSteps';
import { ProvisionState } from '@/lib/provisioning/states';

type Props = {
  state: ProvisionState;
};

export function ProvisioningProgress({ state }: Props) {
  const ui = PROVISION_UI[state];

  if (!ui) return null;

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{ui.title}</div>
      <div className="text-xs text-muted-foreground">
        {ui.description}
      </div>
    </div>
  );
}
