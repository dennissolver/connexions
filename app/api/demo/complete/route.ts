import { NextResponse } from "next/server";
import { parseFinalSpec } from "@/lib/interview/parseFinalSpec";
import { createDemoInterview } from "@/lib/interview/createDemoInterview";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const leadId = body.leadId;
    const finalMessage = body.finalMessage;

    if (!leadId || !finalMessage) {
      return NextResponse.json(
        { error: "Missing leadId or finalMessage" },
        { status: 400 }
      );
    }

    const spec = parseFinalSpec(finalMessage);

    const interviewId = await createDemoInterview({
      leadId,
      spec,
    });

    return NextResponse.json({ interviewId });
  } catch (err: any) {
    console.error("Demo completion error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to complete demo" },
      { status: 500 }
    );
  }
}

