// lib/llm/parseInterviewSpec.ts

export function parseInterviewSpec(input: string) {
  return {
    raw: input,
    parsedAt: new Date().toISOString(),
  };
}
