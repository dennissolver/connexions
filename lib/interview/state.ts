import { InterviewFlowState } from "@/lib/prompts/compiler";
import { supabaseService } from "@/lib/supabase/service";

/**
 * Advance the interview phase deterministically.
 */
export function advancePhase(
  state: InterviewFlowState
): InterviewFlowState["phase"] {
  if (state.phase === "intro") return "context";
  if (state.phase === "context") return "questions";
  if (state.phase === "questions") return "wrapup";
  return "complete";
}

/**
 * Determine whether the interview is complete.
 */
export function checkCompletion(state: InterviewFlowState): boolean {
  return (
    state.phase === "wrapup" &&
    state.answered_questions.length >= state.required_questions.length
  );
}

/**
 * Persist a single interview turn (participant or assistant).
 * This is a real write using the Supabase service role.
 */
export async function saveTurn({
  interviewInstanceId,
  role,
  content,
}: {
  interviewInstanceId: string;
  role: "user" | "assistant";
  content: string;
}): Promise<void> {
  const { error } = await supabaseService
    .from("interview_turns")
    .insert({
      interview_instance_id: interviewInstanceId,
      role,
      content,
    });

  if (error) {
    console.error(
      "[saveTurn] Failed to persist interview turn",
      error
    );
  }
}
