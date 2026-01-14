export type InterviewPhase =
  | "intro"
  | "context"
  | "core"
  | "probe"
  | "wrapup"
  | "complete";

export interface InterviewState {
  interview_id: string;

  phase: InterviewPhase;

  turn_count: number;

  answered_questions: string[];
  required_questions: string[];
  optional_questions: string[];

  min_depth_met: boolean;
  completion_ready: boolean;

  created_at: string;
  updated_at: string;
}

