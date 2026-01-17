export async function verify(run: any) {
  const res = await fetch(`https://api.elevenlabs.io/v1/agents/${run.eleven_agent_id}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.ELEVEN_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ text: "ping" })
  });

  const json = await res.json();
  if (json.output?.length) return 'ADVANCE';
  return 'WAIT';
}
