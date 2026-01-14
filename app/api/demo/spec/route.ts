import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const { leadId, spec } = await req.json();

    if (!leadId || !spec) {
      return NextResponse.json(
        { error: "Missing leadId or spec" },
        { status: 400 }
      );
    }

    // Basic schema guard (intentionally strict)
    if (
      !spec.goal ||
      !spec.target_participant ||
      !Array.isArray(spec.questions) ||
      !spec.voice_profile
    ) {
      return NextResponse.json(
        { error: "Invalid interviews spec" },
        { status: 400 }
      );
    }

    // 1. Store spec
    const { data: savedSpec, error: specError } = await supabaseAdmin
      .from("demo_interview_specs")
      .insert({
        lead_id: leadId,
        interview_type: spec.interview_type,
        goal: spec.goal,
        target_participant: spec.target_participant,
        duration_mins: spec.duration_mins,
        questions: spec.questions,
        voice_profile: spec.voice_profile,
      })
      .select("id")
      .single();

    if (specError || !savedSpec) {
      console.error(specError);
      return NextResponse.json(
        { error: "Failed to save interviews spec" },
        { status: 500 }
      );
    }

    // 2. Create interviews immediately
    const interviewRes = await fetch(
      new URL("/api/demo/create-interviews", req.url),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ specId: savedSpec.id }),
      }
    );

    if (!interviewRes.ok) {
      return NextResponse.json(
        { error: "Interview creation failed" },
        { status: 500 }
      );
    }

    const interviewData = await interviewRes.json();

    return NextResponse.json({
      interviewId: interviewData.interviewId,
      launchUrl: interviewData.launchUrl,
    });
  } catch (err) {
    console.error("Demo spec ingest failed:", err);
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}

