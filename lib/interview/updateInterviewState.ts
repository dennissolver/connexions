import { supabaseAdmin } from "@/lib/supabase/admin";
import { InterviewState } from "@/types/interview-state";

export async function updateInterviewState(
  interviewId: string,
  nextState: Partial<InterviewState>
) {
  const { error } = await supabaseAdmin
    .from("interview_state")
    .update(nextState)
    .eq("interview_id", interviewId);

  if (error) {
    console.error("updateInterviewState error:", error);
    throw error;
  }
}
