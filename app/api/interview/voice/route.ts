export const runtime = "nodejs";

import { NextResponse } from "next/server";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

import { compileInterviewerSystemPrompt } from "@/lib/prompts/compiler";
import {
  getInterviewInstance,
  getInterviewState,
  saveTurn,
  updateInterviewState,
} from "@/lib/interview";
import { advancePhase, checkCompletion } from "@/lib/interview/state";
import { getOpenAIClient } from "@/lib/llm/openai";

export async function POST(req: Request) {
  const body = await req.json();
  const { interviewInstanceId, participantText } = body;

  if (!interviewInstanceId) {
    return NextResponse.json(
      { error: "interviewInstanceId is required" },
      { status: 400 }
    );
  }

  // 1. Load interview + state
  const instance = await getInterviewInstance(interviewInstanceId);
  const state = await getInterviewState(interviewInstanceId);

  if (!instance) {
    return NextResponse.json({ error: "Interview not found" }, { status: 404 });
  }

  if (instance.status !== "in_progress") {
    return NextResponse.json(
      { error: "Interview is not active" },
      { status: 403 }
    );
  }

  if (!state) {
    return NextResponse.json(
      { error: "Interview state missing" },
      { status: 500 }
    );
  }

  if (state.phase === "complete") {
    return NextResponse.json({
      message: "Interview already completed",
    });
  }

  const isFirstTurn = state.turn_count === 0;

  // 2. Compile system prompt
  const systemPrompt = compileInterviewerSystemPrompt({
    interviewObjective: instance.objective,
    interviewMode: instance.mode as "interview" | "survey",
    state,
  });

  // 3. Build messages (typed correctly)
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

  // 4. Call LLM
  const openai = getOpenAIClient();

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    messages,
  });

  const agentReply = completion.choices[0]?.message?.content ?? "";

  // 5. Persist transcript
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

  // 6. Advance state
  const nextState = {
    ...state,
    turn_count: state.turn_count + 1,
  };

  const updatedState = {
    ...nextState,
    phase: advancePhase(nextState),
    completion_ready: checkCompletion(nextState),
  };

  await updateInterviewState(interviewInstanceId, updatedState);

  return NextResponse.json({
    reply: agentReply,
    phase: updatedState.phase,
    completionReady: updatedState.completion_ready,
  });
}
