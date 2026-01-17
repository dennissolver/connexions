// lib/provisioning/store.ts

import { supabaseAdmin } from "@/lib/supabase/admin";
import { ProvisionState } from "./states";

/**
 * Create a provisioning run.
 * Idempotent by project_slug.
 */
export async function createProvisionRun(params: {
  projectSlug: string;
  initialState: ProvisionState;
  metadata?: Record<string, any>;
  companyName?: string;
  platformName?: string;
}) {
  const {
    projectSlug,
    initialState,
    metadata = {},
    companyName,
    platformName,
  } = params;

  // Check if run already exists
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from("provision_runs")
    .select("id")
    .eq("project_slug", projectSlug)
    .maybeSingle();

  if (fetchError) throw fetchError;

  if (existing) {
    return existing;
  }

  const { data, error } = await supabaseAdmin
    .from("provision_runs")
    .insert({
      project_slug: projectSlug,
      state: initialState,
      metadata,
      company_name: companyName ?? null,
      platform_name: platformName ?? null,
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}

/**
 * Update a provisioning run by slug.
 */
export async function updateProvisionRun(
  projectSlug: string,
  updates: {
    state?: ProvisionState;
    metadata?: Record<string, any>;
    last_error?: string | null;
    sandra_agent_id?: string | null;
    sandra_verified?: boolean;
    kira_agent_id?: string | null;
    kira_verified?: boolean;
  }
) {
  const { error } = await supabaseAdmin
    .from("provision_runs")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("project_slug", projectSlug);

  if (error) throw error;

  return { ok: true };
}

/**
 * Fetch provisioning run by slug.
 */
export async function getProvisionRunBySlug(projectSlug: string) {
  const { data, error } = await supabaseAdmin
    .from("provision_runs")
    .select("*")
    .eq("project_slug", projectSlug)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // not found
    throw error;
  }

  return data;
}

/**
 * Delete provisioning run by slug.
 */
export async function deleteProvisionRunBySlug(projectSlug: string) {
  const { error } = await supabaseAdmin
    .from("provision_runs")
    .delete()
    .eq("project_slug", projectSlug);

  if (error) throw error;

  return { ok: true };
}
