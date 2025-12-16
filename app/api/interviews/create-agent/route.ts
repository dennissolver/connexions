import { NextResponse } from "next/server";
import { buildInterviewAgentPrompt } from "@/lib/prompts/interviewAgentPrompt";

export async function POST(req: Request) {
  const interviewSpec = await req.json();

  const prompt = buildInterviewAgentPrompt(interviewSpec);

  const res = await fetch(
    "https://api.elevenlabs.io/v1/convai/agents/create",
    {
      method: "POST",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: interviewSpec.interview_name,
        conversation_config: {
          agent: {
            prompt: { prompt },
            first_message: "Thank you for joining. Let's begin.",
            language: "en",
          },
          tts: {
            model_id: "eleven_turbo_v2_5",
          },
          stt: {
            provider: "elevenlabs",
          },
          turn: { mode: "turn_based" },
        },
        platform_settings: {
          webhook: {
            url: process.env.ELEVENLABS_WEBHOOK_URL!,
            events: [
              "conversation.transcript",
              "conversation.ended",
            ],
          },
        },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json(
      { error: err },
      { status: 500 }
    );
  }

  const agent = await res.json();
  return NextResponse.json(agent);
}
