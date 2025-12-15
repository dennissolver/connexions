# ================================
# AI Agent Interviewer
# One-Pass Structural Reconstruction
# ================================
# Run from repo root
# Compatible with Windows PowerShell
# ================================

Write-Host "Starting agent config and prompt reconstruction..."

# ---------- Helpers ----------
function Ensure-Dir {
  param ([string]$path)

  if (-not (Test-Path $path)) {
    New-Item -ItemType Directory -Path $path | Out-Null
    Write-Host "Created directory: $path"
  }
}

# ---------- Ensure folders ----------
Ensure-Dir "types"
Ensure-Dir "lib\prompts"
Ensure-Dir "supabase\migrations"

# ---------- 1. types/role.ts ----------
$roleTs = @"
export type InterviewerRoleDefinition = {
  description: string
  authority_stance: string
  questioning_style: string
  probing_expectations: string
  must_do: string[]
  must_not_do: string[]
}
"@

Set-Content -Path "types\role.ts" -Value $roleTs -Encoding UTF8
Write-Host "Updated types/role.ts"

# ---------- 2. types/agent-config.ts ----------
$agentConfigTs = @"
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
"@

Set-Content -Path "types\agent-config.ts" -Value $agentConfigTs -Encoding UTF8
Write-Host "Created types/agent-config.ts"

# ---------- 3. lib/prompts/setup-agent.ts ----------
$setupAgentPrompt = @"
export function buildSetupAgentSystemPrompt(): string {
  return `
You are an AI Setup Agent whose responsibility is to design a bespoke AI Interviewer Agent.

Your priority is fidelity to the client's intent.
You must not assume predefined interviewer archetypes.
Any role patterns you recognize are for internal reasoning only.

You must not complete setup until ALL of the following are clearly established:
- Business context
- Website grounding OR explicit absence
- Interview purpose
- Client-defined interviewer role
- Brand and conduct constraints

Behave conversationally and adaptively.
If information is vague, probe for clarity.
Do not rush completion.
`;
}
"@

Set-Content -Path "lib\prompts\setup-agent.ts" -Value $setupAgentPrompt -Encoding UTF8
Write-Host "Rebuilt lib/prompts/setup-agent.ts"

# ---------- 4. lib/prompts/interviewer-agent.ts ----------
$interviewerAgentPrompt = @"
import { AgentConfig } from "@/types/agent-config"

export function buildInterviewerPrompt(config: AgentConfig): string {
  return `
You are an AI interviewer representing the following business:

${config.business_profile.description}

INTERVIEWER ROLE (CLIENT-DEFINED):
${JSON.stringify(config.interviewer_role, null, 2)}

INTERVIEW PURPOSE:
${config.interview_purpose}

You must behave strictly according to this role definition.
Do not invent behaviours.
Do not drift from constraints.
`;
}
"@

Set-Content -Path "lib\prompts\interviewer-agent.ts" -Value $interviewerAgentPrompt -Encoding UTF8
Write-Host "Rebuilt lib/prompts/interviewer-agent.ts"

# ---------- 5. lib/prompts/eval-agent.system.ts ----------
$evalAgentPrompt = @"
import { AgentConfig } from "@/types/agent-config"

export function buildEvalPrompt(
  config: AgentConfig,
  transcript: string
): string {
  return `
Evaluate the interviewer strictly against the CLIENT-DEFINED ROLE.
Do not apply generic interview standards.

ROLE DEFINITION:
${JSON.stringify(config.interviewer_role, null, 2)}

TRANSCRIPT:
${transcript}

Return STRICT JSON with:
- role_adherence_score
- alignment_examples
- violations
- deviation_signals
- summary
`;
}
"@

Set-Content -Path "lib\prompts\eval-agent.system.ts" -Value $evalAgentPrompt -Encoding UTF8
Write-Host "Created lib/prompts/eval-agent.system.ts"

# ---------- 6. Supabase migration ----------
$migrationName = "20241216090000_agent_config_and_role_eval.sql"
$migrationPath = "supabase\migrations\$migrationName"

if (-not (Test-Path $migrationPath)) {

  $migrationSql = @"
ALTER TABLE agents
ADD COLUMN agent_config JSONB;

ALTER TABLE interview_evaluations
ADD COLUMN role_adherence_score INTEGER,
ADD COLUMN role_adherence_analysis JSONB;

CREATE TABLE role_adherence_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  interview_id UUID REFERENCES interviews(id) ON DELETE CASCADE,
  role_adherence_score INTEGER NOT NULL,
  deviation_signals JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
"@

  Set-Content -Path $migrationPath -Value $migrationSql -Encoding UTF8
  Write-Host "Created migration: $migrationName"
}
else {
  Write-Host "Migration already exists, skipping"
}

Write-Host "Reconstruction complete."
Write-Host "Next steps:"
Write-Host "1. npm run build"
Write-Host "2. npx supabase db push"
Write-Host "3. git add . && git commit -m 'Introduce canonical agent config and role-aware prompts'"
