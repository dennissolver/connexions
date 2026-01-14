export async function fetchSupabaseApiKeys(projectRef: string, token: string) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/api-keys`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) throw new Error(`Failed to fetch Supabase keys: ${res.status}`);

  const keys = await res.json();

  return {
    anon: keys.find((k: any) => k.name === 'anon')?.api_key,
    service_role: keys.find((k: any) => k.name === 'service_role')?.api_key,
  };
}
