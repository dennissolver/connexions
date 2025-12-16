// lib/elevenlabs/createInterviewAgent.ts

import { buildInterviewAgentPrompt } from "@/lib/prompts/interviewAgentPrompt";

export async function createInterviewAgent(interviewSpec: any) {
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
      }),
    }
  );

  if (!res.ok) {
    throw new Error("Failed to create ElevenLabs interview agent");
  }

  return res.json();
}
