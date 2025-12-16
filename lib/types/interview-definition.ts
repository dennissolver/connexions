// lib/types/interviews-definition.ts
export interface InterviewDefinition {
  mode: "interview" | "survey";

  objective: string;

  tone: string;

  targetAudience?: string;

  requiredQuestions: string[];
  optionalQuestions?: string[];

  constraints?: string[];

  estimatedDurationMins?: number;
}
