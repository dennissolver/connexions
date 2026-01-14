// app/api/demo/create-interview/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

interface InterviewSpec {
  interview_type: "interview" | "survey";
  goal: string;
  target_participant: string;
  duration_mins: number;
  questions: {
    id: string;
    text: string;
    intent: string;
  }[];
  voice_profile: {
    provider: "elevenlabs";
    gender: "male" | "female";
    tone: string;
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { leadId, spec } = body as {
      leadId: string;
      spec: InterviewSpec;
    };

    if (!leadId || !spec) {
      return NextResponse.json(
        { error: "Missing leadId or spec" },
        { status: 400 }
      );
    }

    // ------------------------------------------------------------------
    // 1. Validate demo lead
    // ------------------------------------------------------------------
    const { data: lead, error: leadError } = await supabaseAdmin
      .from("demo_leads")
      .select("id")
      .eq("id", leadId)
      .single();

    if (leadError || !lead) {
      return NextResponse.json(
        { error: "Invalid demo lead" },
        { status: 400 }
      );
    }

    // ------------------------------------------------------------------
    // 2. Create DEMO AGENT
    // ------------------------------------------------------------------
    const { data: agent, error: agentError } = await supabaseAdmin
      .from("agents")
      .insert({
        name: "Demo Interview Agent",
        description: spec.goal,
        interview_type: spec.interview_type,
        target_participant: spec.target_participant,
        estimated_duration_mins: spec.duration_mins,
        is_demo: true,
      })
      .select("id")
      .single();

    if (agentError || !agent) {
      console.error("Agent creation failed:", agentError);
      return NextResponse.json(
        { error: "Failed to create demo agent" },
        { status: 500 }
      );
    }

    // ------------------------------------------------------------------
    // 3. Store PROMPT VERSION (questions + intent)
    // ------------------------------------------------------------------
    const { error: promptError } = await supabaseAdmin
      .from("prompt_versions")
      .insert({
        agent_id: agent.id,
        prompt_type: "interview_definition",
        content: {
          goal: spec.goal,
          questions: spec.questions,
          voice_profile: spec.voice_profile,
        },
        is_active: true,
        is_demo: true,
      });

    if (promptError) {
      console.error("Prompt version failed:", promptError);
      return NextResponse.json(
        { error: "Failed to store interview definition" },
        { status: 500 }
      );
    }

    // ------------------------------------------------------------------
    // 4. Create INTERVIEW INSTANCE
    // ------------------------------------------------------------------
    const { data: interview, error: interviewError } = await supabaseAdmin
      .from("interviews")
      .insert({
        agent_id: agent.id,
        status: "ready",
        source: "demo",
        is_demo: true,
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (interviewError || !interview) {
      console.error("Interview creation failed:", interviewError);
      return NextResponse.json(
        { error: "Failed to create demo interview" },
        { status: 500 }
      );
    }

    // ------------------------------------------------------------------
    // 5. Initialise interview state
    // ------------------------------------------------------------------
    await supabaseAdmin
      .from("interview_state")
      .insert({
        interview_id: interview.id,
        state: "idle",
        is_demo: true,
      });

    // ------------------------------------------------------------------
    // DONE
    // ------------------------------------------------------------------
    return NextResponse.json({
      interviewId: interview.id,
    });
  } catch (err) {
    console.error("Demo interview creation error:", err);
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}

