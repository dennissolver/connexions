// lib/eval-runner.ts

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function runEvaluation(interviewId: string) {
  // 1. Fetch interviews
  const { data: interview } = await supabase
    .from("interviews")
    .select("id, agent_id, transcript")
    .eq("id", interviewId)
    .single();

  if (!interview?.transcript) return;

  // 2. Fetch agent
  const { data: agent } = await supabase
    .from("agents")
    .select("id, system_prompt, interview_purpose")
    .eq("id", interview.agent_id)
    .single();

  if (!agent?.system_prompt) return;

  // 3. Call evaluator model
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: `
You are evaluating an AI interviewer.

SYSTEM PROMPT:
${agent.system_prompt}

INTERVIEW PURPOSE:
${agent.interview_purpose}

TRANSCRIPT:
${interview.transcript}

Return JSON ONLY:
{
  "prompt_adherence_score": number (0-100),
  "goal_achievement_score": number (0-100),
  "conversation_quality_score": number (0-100),
  "user_engagement_score": number (0-100),
  "issues": [string]
}
`,
      },
    ],
  });

  const raw =
    response.content[0]?.type === "text"
      ? response.content[0].text
      : "{}";

  let json: any = {};
  try {
    json = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || "{}");
  } catch {
    json = {};
  }

  // 4. Derive drift
  const roleDriftScore = Math.max(
    0,
    100 - (json.prompt_adherence_score ?? 0)
  );
  const driftFlag = roleDriftScore >= 30;

  // 5. Store evaluation
  await supabase
    .from("interview_evaluations")
    .insert({
      interview_id: interviewId,
      prompt_adherence_score: json.prompt_adherence_score,
      goal_achievement_score: json.goal_achievement_score,
      conversation_quality_score: json.conversation_quality_score,
      user_engagement_score: json.user_engagement_score,
      role_drift_score: roleDriftScore,
      drift_flag: driftFlag,
      issues: json.issues ?? [],
    });

  return {
    roleDriftScore,
    driftFlag,
  };
}

// ✅ alias export MUST be top-level
export const evalRunner = runEvaluation;
