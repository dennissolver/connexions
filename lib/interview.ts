// lib/interview.ts
// Canonical interview domain contract

export interface InterviewTurn {
  interviewInstanceId: string;
  role: "user" | "assistant";
  content: string;
}

export interface InterviewState {
  phase: string;
  turn_count: number;
  answered_questions: string[];
  required_questions: string[];
  completion_ready: boolean;
}

/* =========================
   READ
========================= */

export async function getInterviewInstance(interviewInstanceId: string) {
  return {
    id: interviewInstanceId,
    status: "in_progress",
    mode: "interview",
    objective: "Conduct interview",
    agent_config: {},
  };
}

export async function getInterviewState(
  interviewInstanceId: string
): Promise<InterviewState> {
  return {
    phase: "intro",
    turn_count: 0,
    answered_questions: [],
    required_questions: [],
    completion_ready: false,
  };
}

/* =========================
   WRITE
========================= */

export async function saveTurn(turn: InterviewTurn) {
  return true;
}

export async function updateInterviewState(
  interviewInstanceId: string,
  state: InterviewState
) {
  return true;
}

/* =========================
   INITIALISATION
========================= */

export async function initialiseInterviewState(
  interviewInstanceId: string
): Promise<InterviewState> {
  const initialState: InterviewState = {
    phase: "intro",
    turn_count: 0,
    answered_questions: [],
    required_questions: [],
    completion_ready: false,
  };

  return initialState;
}
