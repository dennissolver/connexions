import { supabaseAdmin } from "@/lib/supabase/admin";

export async function initialiseInterviewState(
  interviewId: string,
  requiredQuestions: string[] = [],
  optionalQuestions: string[] = []
) {
  const { error } = await supabaseAdmin
    .from("interview_state")
    .insert({
      interview_id: interviewId,
      phase: "intro",
      turn_count: 0,
      answered_questions: [],
      required_questions: requiredQuestions,
      optional_questions: optionalQuestions,
      min_depth_met: false,
      completion_ready: false,
    });

  if (error) {
    console.error("initialiseInterviewState error:", error);
    throw error;
  }
}
