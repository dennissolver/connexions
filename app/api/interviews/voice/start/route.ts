import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { initialiseInterviewState } from "@/lib/interview/initialiseInterviewState";


/**
 * POST /api/interviews/voice/start
 *
 * Responsibilities:
 * - Validate request
 * - Obtain ElevenLabs signed URL
 * - Create interviews instance
 * - Initialise system-owned interviews state
 *
 * DOES NOT:
 * - Call LLMs
 * - Compile prompts
 * - Run interviews turns
 * - Trigger evaluations
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId, elevenLabsAgentId } = body;

    if (!agentId) {
      return NextResponse.json(
        { error: "agentId is required" },
        { status: 400 }
      );
    }

    if (!elevenLabsAgentId) {
      return NextResponse.json(
        { error: "ElevenLabs agent ID required" },
        { status: 400 }
      );
    }

    const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenLabsKey) {
      return NextResponse.json(
        { error: "ELEVENLABS_API_KEY not configured" },
        { status: 500 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: "Supabase configuration missing" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    /**
     * 1. Obtain ElevenLabs signed URL (voice session bootstrap)
     */
    const signedUrlRes = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${elevenLabsAgentId}`,
      {
        method: "GET",
        headers: {
          "xi-api-key": elevenLabsKey,
        },
      }
    );

    if (!signedUrlRes.ok) {
      const error = await signedUrlRes.json();
      console.error("ElevenLabs signed URL error:", error);
      return NextResponse.json(
        { error: "Failed to start voice session" },
        { status: 500 }
      );
    }

    const signedUrlData = await signedUrlRes.json();

    /**
     * 2. Create interviews instance
     */
    const { data: interview, error: interviewError } = await supabase
      .from("interviews")
      .insert({
        agent_id: agentId,
        status: "in_progress",
        source: "voice",
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (interviewError || !interview?.id) {
      console.error("Failed to create interviews:", interviewError);
      return NextResponse.json(
        { error: "Failed to create interviews" },
        { status: 500 }
      );
    }

    const interviewId = interview.id;

    /**
     * 3. Initialise interviews state (SYSTEM-OWNED)
     * Interview MUST NOT exist without state
     */
    await initialiseInterviewState(interviewId);

    /**
     * 4. Increment agent usage metrics (non-blocking)
     */
    try {
      await supabase.rpc("increment_agent_interviews", {
        p_agent_id: agentId,
      });
    } catch (metricError) {
      console.warn(
        "Failed to increment agent interviews count:",
        metricError
      );
      // Non-fatal
    }

    /**
     * 5. Success
     */
    return NextResponse.json({
      success: true,
      interviewId,
      signedUrl: signedUrlData.signed_url,
    });

  } catch (error) {
    console.error("Voice start error:", error);
    return NextResponse.json(
      { error: "Failed to start voice interviews" },
      { status: 500 }
    );
  }
}
