import type { InterviewPhase as FlowPhase } from "@/lib/prompts/compiler";
import type { InterviewPhase as PersistedPhase } from "@/types/interview-state";

/**
 * Convert prompt-flow phase into persisted lifecycle phase.
 */
export function mapFlowPhaseToPersistedPhase(
  phase: FlowPhase
): PersistedPhase {
  switch (phase) {
    case "context":
    case "questions":
      return "core";

    case "intro":
    case "wrapup":
    case "complete":
      return phase;

    default:
      return "intro";
  }
}
