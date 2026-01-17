// app/api/setup/start/route.ts

import { NextResponse } from "next/server";
import { createProvisionRun } from "@/lib/provisioning/store";
import { runProvisioning } from "@/lib/provisioning/orchestrator";
import { ProvisionState } from "@/lib/provisioning";

export async function POST(req: Request) {
  let body: any;

  // 1. Parse JSON safely
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid or missing JSON body" },
      { status: 400 }
    );
  }

  const {
    platformName,
    companyName,
    contactEmail,
    ownerName,
    ownerRole,
    voicePreference,
  } = body ?? {};

  // 2. Validate required inputs
  if (!platformName || typeof platformName !== "string") {
    return NextResponse.json(
      { error: "platformName is required" },
      { status: 400 }
    );
  }

  if (!companyName || typeof companyName !== "string") {
    return NextResponse.json(
      { error: "companyName is required" },
      { status: 400 }
    );
  }

  // 3. Server-generated slug (never trust client)
  const projectSlug = platformName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);

  // 4. Create provisioning run (idempotent)
  await createProvisionRun({
    projectSlug,
    initialState: "SUPABASE_CREATING" as ProvisionState,
    companyName,
    platformName,
    metadata: {
      contactEmail,
      ownerName,
      ownerRole,
      voicePreference,
    },
  });

  // 5. Fire-and-forget provisioning loop
  runProvisioning(projectSlug).catch((err) => {
    console.error("[Provisioning] Orchestrator error:", err);
  });

  // 6. Respond with slug
  return NextResponse.json({
    ok: true,
    projectSlug,
  });
}
