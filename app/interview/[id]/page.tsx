// app/interviews/[id]/page.tsx
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import InterviewRunner from "./InterviewRunner";

export default async function InterviewPage({
  params,
}: {
  params: { id: string };
}) {
  const { data: interview } = await supabaseAdmin
    .from("interviews")
    .select(`
      id,
      status,
      is_demo,
      agents (
        id,
        name,
        elevenlabs_agent_id
      )
    `)
    .eq("id", params.id)
    .single();

  if (!interview) notFound();

  const agent = interview.agents?.[0];

  if (!agent) {
    return <div>No agent assigned to this interview.</div>;
  }

  return (
    <InterviewRunner
      interviewId={interview.id}
      agentName={agent.name}
      elevenlabsAgentId={agent.elevenlabs_agent_id}
      isDemo={interview.is_demo}
    />
  );
}
