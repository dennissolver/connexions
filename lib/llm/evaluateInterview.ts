// lib/llm/evaluateInterview.ts

import { anthropic } from "./anthropic";

export async function evaluateInterview({
  transcript,
  goal,
  questions,
}: {
  transcript: string;
  goal: string;
  questions: any[];
}) {
  const res = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: JSON.stringify({ goal, questions, transcript }),
      },
    ],
    system: `You are an interview evaluation engine.
Your job is to assess signal quality, role adherence, and insight extraction.
Be precise. No hype.
Return valid JSON only.`,
  });

  const textBlock = res.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  return JSON.parse(textBlock.text);
}
