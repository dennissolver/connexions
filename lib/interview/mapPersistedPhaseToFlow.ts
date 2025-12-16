import type { InterviewPhase } from "@/types/interview-state";
import type { InterviewFlowState } from "@/lib/prompts/compiler";

/**
 * Reduce persisted lifecycle phases into
 * prompt-safe flow phases.
 */
export function mapPersistedPhaseToFlow(
  phase: InterviewPhase
): InterviewFlowState["phase"] {
  switch (phase) {
    case "intro":
      return "intro";

    case "context":
      return "context";

    case "core":
    case "probe":
      return "questions";

    case "wrapup":
      return "wrapup";

    case "complete":
      return "complete";

    default:
      return "intro";
  }
}
