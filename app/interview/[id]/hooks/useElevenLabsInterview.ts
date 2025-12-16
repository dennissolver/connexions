"use client";

import { useCallback, useRef } from "react";

interface UseElevenLabsInterviewArgs {
  interviewId: string;
  elevenlabsAgentId: string;
  isDemo: boolean;
  onTranscript: (text: string) => void;
  onFinalSpec: (spec: string) => void;
}

export function useElevenLabsInterview({
  interviewId,
  elevenlabsAgentId,
  isDemo,
  onTranscript,
  onFinalSpec,
}: UseElevenLabsInterviewArgs) {
  const activeRef = useRef(false);

  const start = useCallback(async () => {
    if (activeRef.current) return;
    activeRef.current = true;

    try {
      const res = await fetch(
        isDemo ? "/api/demo/start" : "/api/interviews/voice/start",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            interviewId,
            elevenlabsAgentId,
          }),
        }
      );

      if (!res.ok) {
        throw new Error("Failed to start interview");
      }

      onTranscript("Interview started.");
    } catch (err) {
      console.error(err);
      onTranscript("Failed to start interview.");
      activeRef.current = false;
    }
  }, [interviewId, elevenlabsAgentId, isDemo, onTranscript]);

  const stop = useCallback(async () => {
    if (!activeRef.current) return;
    activeRef.current = false;

    try {
      await fetch("/api/interviews/voice/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interviewId }),
      });

      onFinalSpec("Interview stopped.");
    } catch (err) {
      console.error(err);
      onFinalSpec("Failed to stop interview.");
    }
  }, [interviewId, onFinalSpec]);

  return { start, stop };
}
