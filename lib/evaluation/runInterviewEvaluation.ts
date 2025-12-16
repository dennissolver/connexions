import { supabaseAdmin } from "@/lib/supabase/admin";
import { evaluateInterview } from "@/lib/llm/evaluateInterview";

export async function runInterviewEvaluation(interview: any) {
  const evaluation = await evaluateInterview({
    transcript: interview.transcript,
    goal: interview.goal,
    questions: interview.questions,
  });

  // 1. Store evaluation summary
  await supabaseAdmin.from("interview_evaluations").insert({
    interview_id: interview.id,
    summary: evaluation.summary,
    extracted_data: evaluation.extracted_data,
    confidence_score: evaluation.confidence_score,
  });

  // 2. Store role adherence
  await supabaseAdmin.from("role_adherence_snapshots").insert({
    interview_id: interview.id,
    adherence_score: evaluation.role_adherence.score,
    notes: evaluation.role_adherence.notes,
  });

  // 3. Store drift snapshot
  await supabaseAdmin.from("agent_drift_snapshots").insert({
    interview_id: interview.id,
    drift_detected: evaluation.drift.detected,
    drift_reason: evaluation.drift.reason,
  });
}
