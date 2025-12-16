// app/api/create-agent/route.ts
// Creates an interviewer agent and persists configuration

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import {
  generateInterviewerPromptAsync,
  InterviewerConfig,
  RoleProfile,
} from "@/lib/prompts/authoredInterviewerPrompt";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ----------------------------
// POST — Create interviewer agent
// ----------------------------
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // 1. Validate required fields
    const requiredFields = [
      "company_name",
      "company_email",
      "agent_name",
      "agent_role",
      "interview_purpose",
      "target_audience",
      "interview_style",
      "tone",
      "duration_minutes",
      "key_topics",
      "key_questions",
    ];

    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // 2. Generate unique slug
    const slug = generateSlug(data.agent_name, data.company_name);

    const { data: existing } = await supabase
      .from("agents")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "Agent slug already exists" },
        { status: 400 }
      );
    }

    // 3. Build interviewer config
    const config: InterviewerConfig = {
      agent_role: data.agent_role,
      interview_purpose: data.interview_purpose,
      target_audience: data.target_audience,
      interview_style: data.interview_style,
      tone: data.tone,
      duration_minutes: data.duration_minutes,
      key_topics: data.key_topics,
      key_questions: data.key_questions,
      constraints: data.constraints,
      company_name: data.company_name,
    };

    // 4. Generate system prompt + role profile
    const {
      systemPrompt,
      firstMessage,
      roleProfile,
    }: {
      systemPrompt: string;
      firstMessage: string;
      roleProfile: RoleProfile;
    } = await generateInterviewerPromptAsync(
      config,
      process.env.ANTHROPIC_API_KEY
    );

    if (!systemPrompt || !roleProfile) {
      throw new Error("Failed to generate interviewer prompt");
    }

    // 5. Resolve or create client
    let clientId = data.client_id;

    if (!clientId) {
      const { data: existingClient } = await supabase
        .from("clients")
        .select("id")
        .eq("email", data.company_email)
        .maybeSingle();

      if (existingClient) {
        clientId = existingClient.id;
      } else {
        const { data: newClient, error } = await supabase
          .from("clients")
          .insert({
            email: data.company_email,
            company_name: data.company_name,
            company_website: data.company_website,
            name: data.contact_name,
          })
          .select()
          .single();

        if (error || !newClient) {
          throw new Error("Failed to create client");
        }

        clientId = newClient.id;
      }
    }

    // 6. Persist agent
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .insert({
        client_id: clientId,
        name: data.agent_name,
        slug,
        status: "active",
        company_name: data.company_name,
        agent_role: data.agent_role,
        interview_purpose: data.interview_purpose,
        target_interviewees: data.target_audience,
        interviewer_tone: data.tone,
        estimated_duration_mins: data.duration_minutes,
        key_topics: data.key_topics,
        key_questions: data.key_questions,
        constraints: data.constraints ? [data.constraints] : null,
        system_prompt: systemPrompt,
        first_message: firstMessage,
        role_profile: roleProfile,
      })
      .select()
      .single();

    if (agentError || !agent) {
      throw new Error("Failed to create agent");
    }

    return NextResponse.json({
      success: true,
      agentId: agent.id,
      slug: agent.slug,
      interviewUrl: `/i/${slug}`,
    });
  } catch (error: any) {
    console.error("Create agent error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create agent" },
      { status: 500 }
    );
  }
}

// ----------------------------
// GET — Fetch agent by ID or slug
// ----------------------------
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const slug = searchParams.get("slug");

    if (!id && !slug) {
      return NextResponse.json(
        { error: "id or slug required" },
        { status: 400 }
      );
    }

    let query = supabase.from("agents").select("*");

    if (id) query = query.eq("id", id);
    if (slug) query = query.eq("slug", slug);

    const { data: agent, error } = await query.single();

    if (error || !agent) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ agent });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch agent" },
      { status: 500 }
    );
  }
}

// ----------------------------
// Helpers
// ----------------------------
function generateSlug(agentName: string, companyName: string): string {
  const base = `${companyName}-${agentName}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);

  const suffix = Math.random().toString(36).substring(2, 6);
  return `${base}-${suffix}`;
}
