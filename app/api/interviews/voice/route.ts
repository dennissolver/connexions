// app/api/interviews/voice/route.ts.ts

export const runtime = "nodejs";

import { NextResponse } from "next/server";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

import { getOpenAIClient } from "@/lib/llm/openai";

import { compileInterviewerSystemPrompt } from "@/lib/prompts/compiler";
import type { InterviewFlowState } from "@/lib/prompts/compiler";

import { getInterviewInstance } from "@/lib/interview/getInterviewInstance";
import { getInterviewState } from "@/lib/interview/getInterviewState";
import { updateInterviewState } from "@/lib/interview/updateInterviewState";
import { mapPersistedPhaseToFlow } from "@/lib/interview/mapPersistedPhaseToFlow";

import {
  saveTurn,
  advancePhase,
  checkCompletion,
} from "@/lib/interview/state";

import { mapFlowPhaseToPersistedPhase } from "@/lib/interview/mapFlowPhaseToPersisted";

export async function POST(req: Request) {
  const body = await req.json();
  const { interviewInstanceId, participantText } = body;

  if (!interviewInstanceId) {
    return NextResponse.json(
      { error: "interviewInstanceId is required" },
      { status: 400 }
    );
  }

  /* ------------------------------------------------------------------ */
  /* 1. Load interview + persisted state                                 */
  /* ------------------------------------------------------------------ */

  const instance = await getInterviewInstance(interviewInstanceId);
  const persistedState = await getInterviewState(interviewInstanceId);

  if (!instance) {
    return NextResponse.json({ error: "Interview not found" }, { status: 404 });
  }

  if (instance.status !== "in_progress") {
    return NextResponse.json(
      { error: "Interview is not active" },
      { status: 403 }
    );
  }

  if (!persistedState) {
    return NextResponse.json(
      { error: "Interview state missing" },
      { status: 500 }
    );
  }

  if (persistedState.phase === "complete") {
    return NextResponse.json({
      message: "Interview already completed",
    });
  }

  /* ------------------------------------------------------------------ */
  /* 2. Derive prompt-flow state (LLM-only)                              */
  /* ------------------------------------------------------------------ */

  const flowState: InterviewFlowState = {
    phase: mapPersistedPhaseToFlow(persistedState.phase),
    turn_count: persistedState.turn_count,
    answered_questions: persistedState.answered_questions ?? [],
    required_questions: persistedState.required_questions ?? [],
  };

  const isFirstTurn = flowState.turn_count === 0;

  /* ------------------------------------------------------------------ */
  /* 3. Compile system prompt                                            */
  /* ------------------------------------------------------------------ */

  const systemPrompt = compileInterviewerSystemPrompt({
    interviewObjective: instance.objective,
    interviewMode: instance.mode as "interview" | "survey",
    state: flowState,
  });

  /* ------------------------------------------------------------------ */
  /* 4. Build LLM messages                                               */
  /* ------------------------------------------------------------------ */

  const messages: ChatCompletionMessageParam[] = isFirstTurn
    ? [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content:
            "The call has just started. Greet the participant naturally and explain who you are and the purpose of the call.",
        },
      ]
    : [
        { role: "system", content: systemPrompt },
        { role: "user", content: participantText ?? "" },
      ];

  /* ------------------------------------------------------------------ */
  /* 5. Call LLM                                                         */
  /* ------------------------------------------------------------------ */

  const openai = getOpenAIClient();

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    messages,
  });

  const agentReply = completion.choices[0]?.message?.content ?? "";

  /* ------------------------------------------------------------------ */
  /* 6. Save transcript (non-persistent stub is intentional)             */
  /* ------------------------------------------------------------------ */

  if (participantText?.trim()) {
    await saveTurn({
      interviewInstanceId,
      role: "user",
      content: participantText,
    });
  }

  await saveTurn({
    interviewInstanceId,
    role: "assistant",
    content: agentReply,
  });

  /* ------------------------------------------------------------------ */
  /* 7. Advance FLOW state (prompt-only)                                 */
  /* ------------------------------------------------------------------ */

  const nextFlowState: InterviewFlowState = {
    ...flowState,
    turn_count: flowState.turn_count + 1,
  };

  const nextFlowPhase = advancePhase(nextFlowState);
  const completionReady = checkCompletion(nextFlowState);

  /* ------------------------------------------------------------------ */
  /* 8. Persist ONLY lifecycle-safe fields                               */
  /* ------------------------------------------------------------------ */

  await updateInterviewState(interviewInstanceId, {
    turn_count: nextFlowState.turn_count,
    phase: mapFlowPhaseToPersistedPhase(nextFlowPhase),
  });

  /* ------------------------------------------------------------------ */
  /* 9. Response                                                         */
  /* ------------------------------------------------------------------ */

  return NextResponse.json({
    reply: agentReply,
    phase: nextFlowPhase,
    completionReady,
  });
}

