// lib/interviews/types.ts
export interface InterviewSpec {
  interview_name: string;
  purpose: string;
  target_audience: string;
  interview_style: "structured" | "semi_structured" | "exploratory";
  tone: "professional" | "friendly" | "formal" | "casual";
  estimated_duration_minutes: number | null;
  topics: string[];
  constraints: string[];
  delivery_mode: "voice";
  output_expectations: string[];
}
