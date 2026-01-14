// lib/prompts/compiler.ts

export type InterviewPhase =
  | "intro"
  | "context"
  | "questions"
  | "wrapup"
  | "complete";

export interface InterviewFlowState {
  phase: InterviewPhase;
  turn_count: number;
  answered_questions: string[];
  required_questions: string[];
}

export interface CompilePromptInput {
  interviewObjective: string;
  interviewMode: "interview" | "survey";
  state: InterviewFlowState;
}

export function compileInterviewerSystemPrompt(
  input: CompilePromptInput
): string {
  const { interviewObjective, interviewMode, state } = input;

  const isFirstTurn = state.turn_count === 0;

  return `
You are operating inside a controlled interview system.

INTERVIEW OBJECTIVE:
${interviewObjective}

INTERVIEW MODE:
${interviewMode}

CURRENT INTERVIEW PHASE:
${state.phase}

INTERVIEW PROGRESS:
- Turns completed: ${state.turn_count}
- Required questions answered: ${state.answered_questions.length}/${state.required_questions.length}

CALL STATUS:
${isFirstTurn ? "This call has just started." : "The interview is already in progress."}

IMPORTANT CONTEXT:
- You are the interviewer.
- Interview structure and completion are controlled by the system.
- Your task is to produce the next interviewer utterance only.

Proceed accordingly.
`.trim();
}

// Backwards-compatible alias
export const compileInterviewerPrompt = compileInterviewerSystemPrompt;

