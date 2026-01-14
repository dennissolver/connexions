import { InterviewerRoleDefinition } from "./role"

export type AgentConfig = {
  agent_id: string

  business_profile: {
    description: string
    target_customer: string
    business_model: string
    website_url?: string
    extracted_context?: Record<string, any>
  }

  interview_purpose: string

  interviewer_role: InterviewerRoleDefinition

  tone_and_constraints?: {
    tone: string
    must_avoid?: string[]
    regulatory_notes?: string[]
  }

  created_at: string
  updated_at: string
}

