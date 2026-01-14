import { NextRequest, NextResponse } from "next/server";
import type { ElevenLabsConversation } from "@/lib/elevenlabs/types";
import { supabaseService } from "@/lib/supabase/service";

export async function POST(req: NextRequest) {
  const payload = await req.json();

  // Defensive: ignore non-conversation webhooks
  if (!payload?.conversation_id || !payload?.transcript) {
    return NextResponse.json({ ok: true });
  }

  const conversation: ElevenLabsConversation = {
    conversationId: payload.conversation_id,
    agentId: payload.agent_id,
    startedAt: payload.started_at,
    endedAt: payload.ended_at,
    transcript: payload.transcript.map((t: any) => ({
      role: t.role === "assistant" ? "agent" : "user",
      text: t.text,
      timestamp: t.timestamp,
    })),
  };

  // Persist raw conversation to Supabase (service role)
  const { error } = await supabaseService
    .from("elevenlabs_conversations")
    .insert({
      conversation_id: conversation.conversationId,
      agent_id: conversation.agentId,
      started_at: conversation.startedAt,
      ended_at: conversation.endedAt ?? null,
      transcript: conversation.transcript,
    });

  if (error) {
    console.error(
      "[ElevenLabs webhook] Failed to persist conversation",
      error
    );
    // Do NOT fail the webhook â€” ElevenLabs will retry
  }

  /**
   * Optional next step (intentionally not wired yet):
   * - enqueue parsing / evaluation job
   * - trigger analysis pipeline
   *
   * This should be done via:
   *  - Supabase Edge Function
   *  - background worker
   *  - cron-triggered job
   */

  return NextResponse.json({ ok: true });
}

