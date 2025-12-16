"use client";

import { useState } from "react";

import { useElevenLabsInterview } from "./hooks/useElevenLabsInterview";

interface InterviewRunnerProps {
  interviewId: string;
  agentName: string;
  elevenlabsAgentId: string;
  isDemo: boolean;
}

export default function InterviewRunner({
  interviewId,
  agentName,
  elevenlabsAgentId,
  isDemo,
}: InterviewRunnerProps) {
  const [lines, setLines] = useState<string[]>([]);

  const { start, stop } = useElevenLabsInterview({
    interviewId,
    elevenlabsAgentId,
    isDemo,
    onTranscript: (text: string) => {
      setLines((prev) => [...prev.slice(-20), text]);
    },
    onFinalSpec: (finalSpec: string) => {
      setLines((prev) => [...prev, `FINAL: ${finalSpec}`]);
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">
          Interview with {agentName}
        </h2>
      </div>

      <div className="flex gap-2">
        <button
          onClick={start}
          className="rounded bg-black px-4 py-2 text-white"
        >
          Start Call
        </button>

        <button
          onClick={stop}
          className="rounded border px-4 py-2"
        >
          Stop
        </button>
      </div>

      <pre className="max-h-[400px] overflow-y-auto rounded bg-gray-100 p-3 text-sm">
        {lines.join("\n")}
      </pre>
    </div>
  );
}
