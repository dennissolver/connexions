// lib/types/interview-instance.ts

/**
 * Represents a live or historical interview session.
 *
 * Interview structure is no longer stored as a static
 * definition object. Flow is derived dynamically from
 * interview state + prompt compiler.
 */
export interface InterviewInstance {
  id: string;

  session_id: string;

  /**
   * Lifecycle status of the interview
   */
  status: "ready" | "in_progress" | "complete";

  /**
   * Metadata
   */
  created_at: string;
  updated_at: string;
}

