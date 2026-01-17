
export interface ProvisionStepResult {
  nextState: string;
  metadata?: Record<string, any>;
}

export interface ProvisionContext {
  metadata?: Record<string, any>;
}
