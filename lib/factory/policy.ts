import { DEFAULT_FACTORY_LIMITS } from "@/types/factory";

export function enforceFactoryPolicy({
  existingAgentCount,
  questionsCount,
  durationMins,
  agentsCreatedToday,
}: {
  existingAgentCount: number;
  questionsCount: number;
  durationMins: number;
  agentsCreatedToday: number;
}) {
  const limits = DEFAULT_FACTORY_LIMITS;

  if (existingAgentCount >= limits.maxAgents) {
    throw new Error("Agent limit reached");
  }

  if (questionsCount > limits.maxQuestionsPerAgent) {
    throw new Error("Too many interview questions");
  }

  if (durationMins > limits.maxInterviewDurationMins) {
    throw new Error("Interview duration exceeds allowed maximum");
  }

  if (agentsCreatedToday >= limits.maxAgentsPerDay) {
    throw new Error("Daily agent creation limit reached");
  }
}
