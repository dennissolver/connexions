// lib/llm/gemini.ts

import { GoogleGenerativeAI } from "@google/generative-ai";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY not set");
}

export const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export function getGeminiClient() {
  return gemini;
}
