// lib/elevenlabs/types.ts
export interface ElevenLabsConversation {
  conversationId: string;
  agentId: string;
  startedAt: string;
  endedAt?: string;
  transcript: Array<{
    role: "agent" | "user";
    text: string;
    timestamp?: string;
  }>;
}
