// lib/prompts/interviewAgentPrompt.ts

/**
 * Legacy prompt builder.
 *
 * This file is retained for reference but is no longer
 * part of the active interview execution path.
 *
 * Active prompt compilation now lives in:
 *   - lib/prompts/compiler.ts
 */
export function buildInterviewAgentPrompt(
  spec: {
    purpose: string;
    target_audience: string;
    interview_style: string;
    tone: string;
    topics: string[];
    constraints?: string[];
  }
) {
  return `
You are a professional AI interviewer conducting voice interviews.

Interview purpose:
${spec.purpose}

Target audience:
${spec.target_audience}

Style:
${spec.interview_style}

Tone:
${spec.tone}

Topics to cover:
${spec.topics.map(t => `- ${t}`).join("\n")}

Constraints (do NOT violate):
${
  spec.constraints && spec.constraints.length
    ? spec.constraints.map(c => `- ${c}`).join("\n")
    : "None"
}

Rules:
- Ask one question at a time
- Listen fully before responding
- Do not lead or bias responses
- Stay strictly within scope
- Thank the participant at the end
`.trim();
}
