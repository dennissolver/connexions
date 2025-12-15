// src/evals/roleDriftEval.ts

import { openai } from "@/lib/llm/openai";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { loadPrompt } from "@/lib/prompts/loadPrompt";

interface RoleDriftEvalInput {
  interviewId: string;
  agentRole: string;
  interviewGoals: string;
  transcript: string;
}

export async function runRoleDriftEval({
  interviewId,
  agentRole,
  interviewGoals,
  transcript
}: RoleDriftEvalInput) {
  // 1. Load prompts
  const systemPrompt = await loadPrompt(
    "evaluation/system.role_drift.v1.md"
  );

  const userPromptTemplate = await loadPrompt(
    "evaluation/user.role_drift.v1.md"
  );

  const userPrompt = userPromptTemplate
    .replace("{{AGENT_ROLE}}", agentRole)
    .replace("{{INTERVIEW_GOALS}}", interviewGoals)
    .replace("{{TRANSCRIPT}}", transcript);

  // 2. Call LLM
  const completion = await openai.chat.completions.create({
    model: "gpt-4.1",
    temperature: 0,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    response_format: { type: "json_object" }
  });

  const evalResult = JSON.parse(
    completion.choices[0].message.content ?? "{}"
  );

  /**
   * Expected JSON structure:
   * {
   *   role_adherence_score: number,
   *   tone_consistency_score: number,
   *   question_alignment_score: number,
   *   hallucination_risk_score: number,
   *   role_drift_score: number,
   *   drift_flag: boolean,
   *   summary: string,
   *   issues: string[]
   * }
   */

  // 3. Persist evaluation
  const { error } = await supabaseAdmin
    .from("interview_evaluations")
    .insert({
      interview_id: interviewId,
      role_adherence_score: evalResult.role_adherence_score,
      tone_consistency_score: evalResult.tone_consistency_score,
      question_alignment_score: evalResult.question_alignment_score,
      hallucination_risk_score: evalResult.hallucination_risk_score,
      role_drift_score: evalResult.role_drift_score,
      drift_flag: evalResult.drift_flag,
      summary: evalResult.summary,
      issues: evalResult.issues,
      prompt_version: "role_drift.v1"
    });

  if (error) {
    console.error("Failed to store role drift eval:", error);
    throw error;
  }

  return evalResult;
}
