// lib/jobs/parseSetupConversation.ts

import type { ElevenLabsConversation } from "@/lib/elevenlabs/types";

/**
 * Parse a completed ElevenLabs setup conversation.
 *
 * This is intentionally a stub for now.
 * It will later:
 *  - Flatten transcript
 *  - Run LLM extraction
 *  - Persist derived setup spec
 */
export async function parseSetupConversation(
  conversation: ElevenLabsConversation
) {
  const transcriptText = conversation.transcript
    .map(t => `${t.role.toUpperCase()}: ${t.text}`)
    .join("\n");

  // Placeholder for future parsing logic
  console.log("[parseSetupConversation] transcript:", transcriptText);

  return {
    ok: true,
  };
}
