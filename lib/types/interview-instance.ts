// lib/types/interview-instance.ts
export interface InterviewInstance {
  id: string;

  tenant_id: "demo";
  owner_type: "prospect";
  session_id: string;

  definition: InterviewDefinition;

  status: "ready" | "in_progress" | "complete";

  created_at: string;
}
