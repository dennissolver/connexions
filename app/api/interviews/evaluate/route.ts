import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { runInterviewEvaluation } from "@/lib/evaluation/runInterviewEvaluation";

export async function POST(req: Request) {
  const { interviewId } = await req.json();

  if (!interviewId) {
    return NextResponse.json({ error: "Missing interviewId" }, { status: 400 });
  }

  const { data: interview } = await supabaseAdmin
    .from("interviews")
    .select("*")
    .eq("id", interviewId)
    .single();

  if (!interview) {
    return NextResponse.json({ error: "Interview not found" }, { status: 404 });
  }

  await runInterviewEvaluation(interview);

  return NextResponse.json({ status: "ok" });
}
