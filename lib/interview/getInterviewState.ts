import { supabaseAdmin } from "@/lib/supabase/admin";
import { InterviewState } from "@/types/interview-state";

export async function getInterviewState(
  interviewId: string
): Promise<InterviewState | null> {
  const { data, error } = await supabaseAdmin
    .from("interview_state")
    .select("*")
    .eq("interview_id", interviewId)
    .single();

  if (error) {
    console.error("getInterviewState error:", error);
    return null;
  }

  return data as InterviewState;
}
