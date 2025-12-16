// app/demo/page.tsx
"use client";

import { useSearchParams } from "next/navigation";
import { useState, useCallback } from "react";
import Image from "next/image";
import { Conversation } from "@elevenlabs/client";

export default function DemoPage() {
  const searchParams = useSearchParams();
  const leadId = searchParams.get("leadId");
  const agentId = process.env.NEXT_PUBLIC_DEMO_AGENT_ID;

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "ended">("idle");
  const [isSpeaking, setIsSpeaking] = useState(false);

  const startConversation = useCallback(async () => {
    if (!agentId) return;

    setStatus("connecting");

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const conv = await Conversation.startSession({
        agentId,
        dynamicVariables: {
          lead_id: leadId || "",
        },
        onConnect: () => setStatus("connected"),
        onDisconnect: () => {
          setStatus("ended");
          setConversation(null);
        },
        onModeChange: (mode) => setIsSpeaking(mode.mode === "speaking"),
        onError: (error) => {
          console.error("Conversation error:", error);
          setStatus("idle");
        },
      });

      setConversation(conv);
    } catch (error) {
      console.error("Failed to start:", error);
      setStatus("idle");
    }
  }, [agentId, leadId]);

  const endConversation = useCallback(async () => {
    if (conversation) {
      await conversation.endSession();
      setConversation(null);
      setStatus("ended");
    }
  }, [conversation]);

  if (!leadId || !agentId) {
    return (
      <main className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-red-400">Missing configuration</p>
          <p className="text-xs text-neutral-500">leadId: {leadId || "MISSING"}</p>
          <p className="text-xs text-neutral-500">agentId: {agentId || "MISSING"}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center space-y-8">

        {/* Avatar with status ring */}
        <div className="flex justify-center">
          <div className={`relative rounded-full p-1 ${
            status === "connected" 
              ? isSpeaking 
                ? "ring-4 ring-blue-500 animate-pulse" 
                : "ring-4 ring-green-500"
              : ""
          }`}>
            <Image
              src="/avatar.jpeg"
              alt="AI Interviewer"
              width={120}
              height={120}
              className="rounded-full"
            />
          </div>
        </div>

        <h1 className="text-3xl font-semibold">
          {status === "connected"
            ? isSpeaking ? "AI Speaking..." : "Listening..."
            : "Live Voice Demo"}
        </h1>

        <p className="text-neutral-400">
          {status === "idle" && "You're about to speak with a Connexions AI interviewer."}
          {status === "connecting" && "Connecting..."}
          {status === "connected" && "Speak naturally. The AI will guide the conversation."}
          {status === "ended" && "Interview complete!"}
        </p>

        {/* Start Button */}
        {status === "idle" && (
          <button
            onClick={startConversation}
            className="w-full rounded-lg bg-white text-neutral-900 py-4 font-medium hover:bg-neutral-200 transition"
          >
            Start voice interview
          </button>
        )}

        {/* Connecting */}
        {status === "connecting" && (
          <button disabled className="w-full rounded-lg bg-neutral-700 text-neutral-300 py-4 font-medium">
            Connecting...
          </button>
        )}

        {/* End Button */}
        {status === "connected" && (
          <button
            onClick={endConversation}
            className="w-full rounded-lg bg-red-600 text-white py-4 font-medium hover:bg-red-700 transition"
          >
            End Interview
          </button>
        )}

        {/* Restart */}
        {status === "ended" && (
          <button
            onClick={() => setStatus("idle")}
            className="w-full rounded-lg bg-white text-neutral-900 py-4 font-medium hover:bg-neutral-200 transition"
          >
            Start Another
          </button>
        )}

        <p className="text-xs text-neutral-500">
          Conversations are not retained.
        </p>

      </div>
    </main>
  );
}