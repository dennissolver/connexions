import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    console.log(
      "SERVICE ROLE PRESENT:",
      !!process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const body = await req.json();

    const name = body.name?.toString().trim();
    const company = body.company?.toString().trim();
    const email = body.email?.toString().trim();
    const website = body.website?.toString().trim() || null;

    if (!name || !company || !email) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("demo_clients")
      .insert({
        name,
        company,
        email,
        website,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ demoClientId: data.id });
  } catch (err) {
    console.error("Demo start error:", err);
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}
