import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { enforceFactoryPolicy } from "@/lib/factory/policy";
import { buildSetupAgentSystemPrompt } from "@/lib/prompts/setup-agent";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      clientId,
      interviewerRole,
      goals,
      questions,
      tone,
      estimatedDurationMins,
    } = body;

    // -----------------------------------------------------------------------
    // 1. Validate input (fail fast)
    // -----------------------------------------------------------------------
    if (
      !clientId ||
      !interviewerRole ||
      !interviewerRole.title ||
      !Array.isArray(goals) ||
      !Array.isArray(questions) ||
      typeof estimatedDurationMins !== "number"
    ) {
      return NextResponse.json(
        { error: "Missing or invalid required fields" },
        { status: 400 }
      );
    }

    // -----------------------------------------------------------------------
    // 2. Load current client state (for policy enforcement)
    // -----------------------------------------------------------------------
    const [{ count: agentCount }, { count: agentsToday }] = await Promise.all([
      supabaseAdmin
        .from("agents")
        .select("*", { count: "exact", head: true })
        .eq("client_id", clientId),

      supabaseAdmin
        .from("agents")
        .select("*", { count: "exact", head: true })
        .eq("client_id", clientId)
        .gte("created_at", new Date().toISOString().slice(0, 10)),
    ]);

    // -----------------------------------------------------------------------
    // 3. Enforce factory / usage policy
    // -----------------------------------------------------------------------
    enforceFactoryPolicy({
      existingAgentCount: agentCount ?? 0,
      questionsCount: questions.length,
      durationMins: estimatedDurationMins,
      agentsCreatedToday: agentsToday ?? 0,
    });

    // -----------------------------------------------------------------------
    // 4. Build setup agent system prompt (clients NEVER touch this)
    // -----------------------------------------------------------------------
    const systemPrompt = buildSetupAgentSystemPrompt();

    // -----------------------------------------------------------------------
    // 5. Create agent record
    // -----------------------------------------------------------------------
    const { data: agent, error } = await supabaseAdmin
      .from("agents")
      .insert({
        client_id: clientId,
        name: interviewerRole.title,
        agent_config: {
          interviewer_role: interviewerRole,
          goals,
          questions,
          tone,
          estimated_duration_mins: estimatedDurationMins,
        },
        system_prompt: systemPrompt,
      })
      .select()
      .single();

    if (error || !agent) {
      console.error("Agent creation failed:", error);
      return NextResponse.json(
        { error: "Failed to create agent" },
        { status: 500 }
      );
    }

    // -----------------------------------------------------------------------
    // 6. Return success
    // -----------------------------------------------------------------------
    return NextResponse.json({
      success: true,
      agentId: agent.id,
    });

  } catch (err) {
    console.error("Setup agent error:", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
