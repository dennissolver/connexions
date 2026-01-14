// lib/llm/grok.ts

import OpenAI from "openai";

if (!process.env.XAI_API_KEY) {
  throw new Error("XAI_API_KEY not set");
}

// Grok uses OpenAI-compatible API
export const grok = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: "https://api.x.ai/v1",
});

export function getGrokClient() {
  return grok;
}
