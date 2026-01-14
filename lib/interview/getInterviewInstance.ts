import { supabaseService } from "@/lib/supabase/service";

export type InterviewInstance = {
  id: string;
  status: "in_progress" | "completed" | "cancelled";
  objective: string;
  mode: "interview" | "survey";
};

export async function getInterviewInstance(
  interviewInstanceId: string
): Promise<InterviewInstance | null> {
  const { data, error } = await supabaseService
    .from("interview_instances")
    .select("id, status, objective, mode")
    .eq("id", interviewInstanceId)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

