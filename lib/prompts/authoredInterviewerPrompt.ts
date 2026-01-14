// lib/prompts/authoredInterviewerPrompt.ts

export interface InterviewerConfig {
  agent_role: string;
  interview_purpose: string;
  target_audience: string;
  interview_style: string;
  tone: string;
  duration_minutes: number;
  key_topics: string[];
  key_questions: string[];
  constraints?: string;
  company_name?: string;
}

export interface RoleProfile {
  role_title: string;
  expertise: string[];
  techniques: string[];
  approach: string;
}

/**
 * Base interviewer system prompt builder
 */
export function buildInterviewerPrompt(
  config: InterviewerConfig
): string {
  return `
You are an AI interviewer representing the following business.

INTERVIEWER ROLE (CLIENT-DEFINED):
${config.agent_role}

INTERVIEW PURPOSE:
${config.interview_purpose}

TARGET AUDIENCE:
${config.target_audience}

INTERVIEW STYLE:
${config.interview_style}

TONE:
${config.tone}

KEY TOPICS:
${(config.key_topics ?? []).join("\n")}

KEY QUESTIONS:
${(config.key_questions ?? []).join("\n")}

CONSTRAINTS:
${config.constraints ?? "- None specified"}

GLOBAL RULES:
- You must strictly follow the role definition above.
- Do not invent behaviours or assumptions.
- Do not drift from stated constraints.
- You generate only the next interviewer utterance.
`.trim();
}

/**
 * Async wrapper used by API routes
 */
export async function generateInterviewerPromptAsync(
  config: InterviewerConfig,
  _anthropicApiKey?: string
): Promise<{
  systemPrompt: string;
  firstMessage: string;
  roleProfile: RoleProfile;
}> {
  const systemPrompt = buildInterviewerPrompt(config);

  const roleProfile: RoleProfile = {
    role_title: config.agent_role,
    expertise: [],
    techniques: [],
    approach: "Custom AI-generated interviewer",
  };

  const firstMessage =
    "Hi, thanks for taking the time to speak with me today.";

  return {
    systemPrompt,
    firstMessage,
    roleProfile,
  };
}

