// app/api/leads/create/route.ts.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const formData = await req.formData();
  
  const { data, error } = await supabaseAdmin
    .from("demo_leads")
    .insert({
      name: formData.get("name"),
      email: formData.get("email"),
      company: formData.get("company"),
      use_case: formData.get("use_case"),
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.redirect(
    new URL(`/demo?leadId=${data.id}`, req.url),
    { status: 303 }
  );
}
