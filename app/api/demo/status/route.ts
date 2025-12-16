import { NextRequest, NextResponse } from "next/server";

/**
 * Demo interview status returned to the frontend
 */
type DemoStatus = {
  status: "idle" | "in_call" | "designed" | "ready";
  interviewId?: string;
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const leadId = searchParams.get("leadId");

  if (!leadId) {
    return NextResponse.json(
      { error: "Missing leadId" },
      { status: 400 }
    );
  }

  const demo = await getDemoStatus(leadId);

  // Explicit null guard — critical for TypeScript narrowing
  if (!demo) {
    return NextResponse.json({
      status: "idle",
      interviewId: null,
    });
  }

  return NextResponse.json({
    status: demo.status,
    interviewId: demo.interviewId ?? null,
  });
}

/**
 * Lookup demo interview status for a lead.
 * This is intentionally typed to avoid `never` inference.
 */
async function getDemoStatus(
  leadId: string
): Promise<DemoStatus | null> {
  /**
   * Example real implementation (Supabase / DB):
   *
   * SELECT status, interview_id
   * FROM demo_sessions
   * WHERE lead_id = leadId
   * LIMIT 1
   */

  // Currently no demo session exists
  return null;
}
