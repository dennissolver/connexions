import { InterviewFlowState } from "@/lib/prompts/compiler";


export function advancePhase(
  state: InterviewFlowState
): InterviewFlowState["phase"] {
  if (state.phase === "intro") return "context";
  if (state.phase === "context") return "questions";
  if (state.phase === "questions") return "wrapup";
  return "complete";
}

export function checkCompletion(
  state: InterviewFlowState
): boolean {
  return (
    state.phase === "wrapup" &&
    state.answered_questions.length >= state.required_questions.length
  );
}
