// lib/provisioning/store.ts

export async function createProvisionRun(params: {
  platformName: string;
  companyName?: string;
  metadata?: Record<string, any>;
}) {
  const baseSlug = slugify(params.platformName, {
    lower: true,
    strict: true,
  });

  let slug = baseSlug;
  let i = 1;

  while (true) {
    const { data: existing } = await supabaseAdmin
      .from("provision_runs")
      .select("id")
      .eq("project_slug", slug)
      .maybeSingle();

    if (!existing) break;
    slug = `${baseSlug}-${i++}`;
  }

  const { data, error } = await supabaseAdmin
    .from("provision_runs")
    .insert({
      project_slug: slug,
      state: "SUPABASE_CREATING",
      platform_name: params.platformName,
      company_name: params.companyName,
      metadata: params.metadata ?? {},
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}
