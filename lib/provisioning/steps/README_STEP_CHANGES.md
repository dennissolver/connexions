
// lib/provisioning/steps/elevenlabs.ts
// CHANGE: steps now return *_VERIFYING, never *_READY
return {
  nextState: 'SANDRA_VERIFYING',
  metadata: {
    sandraAgentId: agent.agent_id,
  },
};
