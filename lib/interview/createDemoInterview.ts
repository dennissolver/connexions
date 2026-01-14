import { supabaseAdmin } from "@/lib/supabase/admin";
import { FinalInterviewSpec } from "./parseFinalSpec";

export async function createDemoInterview({
  leadId,
  spec,
}: {
  leadId: string;
  spec: FinalInterviewSpec;
}) {
  const { data, error } = await supabaseAdmin
    .from("interviews")
    .insert({
      is_demo: true,
      source: "demo",
      interviewee_profile: {
        lead_id: leadId,
        target_participant: spec.target_participant,
      },
      extracted_data: spec,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error("Failed to create demo interview");
  }

  return data.id;
}

