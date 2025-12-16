// app/api/webhooks/elevenlabs/route.ts

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";

/**
 * ElevenLabs webhook handler
 *
 * This endpoint intentionally does NOT persist transcripts yet.
 * Its job is to acknowledge webhook events so ElevenLabs
 * considers delivery successful.
 */
export async function POST(req: NextRequest) {
  const payload = await req.json();

  const event = payload?.event;

  // Ignore malformed payloads
  if (!event) {
    return NextResponse.json({ ok: true });
  }

  switch (event) {
    case "conversation.transcript":
      // Transcript received — intentionally no-op for now
      // Future: persist or queue for analysis
      break;

    case "conversation.ended":
      // Conversation ended — intentionally no-op
      break;

    default:
      // Unknown event — safely ignore
      break;
  }

  return NextResponse.json({ ok: true });
}
