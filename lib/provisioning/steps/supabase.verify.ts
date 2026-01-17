export async function verify(run: any) {
  if (!run.vercel_url) return 'WAIT';

  const res = await fetch(run.site_url);
  if (!res.ok) return 'WAIT';

  const body = await res.json();
  if (body.site_url !== run.vercel_url) return 'WAIT';

  return 'ADVANCE';
}
