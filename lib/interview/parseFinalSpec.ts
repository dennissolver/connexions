export interface FinalInterviewSpec {
  interview_type: "interview" | "survey";
  goal: string;
  target_participant: string;
  duration_mins: number;
  questions: {
    id: string;
    text: string;
    intent: string;
  }[];
  voice_profile: {
    provider: "elevenlabs";
    gender: "male" | "female";
    tone: string;
  };
}

export function parseFinalSpec(raw: string): FinalInterviewSpec {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Agent output is not valid JSON");
  }

  const spec = parsed as FinalInterviewSpec;

  if (
    !spec.goal ||
    !spec.target_participant ||
    !spec.duration_mins ||
    !Array.isArray(spec.questions) ||
    spec.questions.length === 0
  ) {
    throw new Error("Incomplete interview specification");
  }

  return spec;
}
