import OpenAI from "openai";

const openai = new OpenAI();

export async function evaluateInterview({
  transcript,
  goal,
  questions,
}: {
  transcript: string;
  goal: string;
  questions: any[];
}) {
  const res = await openai.chat.completions.create({
    model: "gpt-4.1",
    temperature: 0,
    messages: [
      {
        role: "system",
        content: `
You are an interview evaluation engine.
Your job is to assess signal quality, role adherence, and insight extraction.
Be precise. No hype.
Return valid JSON only.
        `,
      },
      {
        role: "user",
        content: JSON.stringify({
          goal,
          questions,
          transcript,
        }),
      },
    ],
  });

  return JSON.parse(res.choices[0].message.content!);
}
