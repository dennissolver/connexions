export function buildEvalAgentSystemPrompt(
  systemPrompt: string,
  interviewPurpose: string,
  transcript: string
): string {
  return `
Evaluate the interviewer strictly against the CLIENT-DEFINED ROLE.
Do not apply generic interview standards.

CLIENT SYSTEM PROMPT:
${systemPrompt}

INTERVIEW PURPOSE:
${interviewPurpose}

INTERVIEW TRANSCRIPT:
${transcript}

Return structured, objective analysis only.
`.trim();
}

