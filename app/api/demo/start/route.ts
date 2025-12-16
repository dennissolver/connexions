// app/api/demo/start/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const leadId = formData.get("leadId")?.toString();

    if (!leadId) {
      return NextResponse.json(
        { error: "Missing leadId" },
        { status: 400 }
      );
    }

    // Optional: validate lead exists
    const { data: lead, error: leadError } = await supabaseAdmin
      .from("demo_leads")
      .select("id")
      .eq("id", leadId)
      .single();

    if (leadError || !lead) {
      return NextResponse.json(
        { error: "Invalid leadId" },
        { status: 400 }
      );
    }

    // Redirect into live demo experience
    return NextResponse.redirect(
      new URL(`/demo/live?leadId=${leadId}`, req.url)
    );

  } catch (err) {
    console.error("Demo start failed:", err);
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}
