export interface FactoryLimits {
  maxAgents: number;
  maxQuestionsPerAgent: number;
  maxInterviewDurationMins: number;
  maxAgentsPerDay: number;
}

export const DEFAULT_FACTORY_LIMITS: FactoryLimits = {
  maxAgents: 20,
  maxQuestionsPerAgent: 40,
  maxInterviewDurationMins: 60,
  maxAgentsPerDay: 5,
};

