export async function verify(run: any) {
  const res = await fetch(`https://api.vercel.com/v13/deployments/${run.vercel_project_id}`, {
    headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN}` }
  });
  const json = await res.json();

  if (json.readyState === 'READY') return 'ADVANCE';
  if (json.error) return 'FAIL';
  return 'WAIT';
}
