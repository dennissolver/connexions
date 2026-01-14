// app/auth/callback/route.ts
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // 🔒 ALWAYS land on dashboard after magic link
      return NextResponse.redirect(
        new URL("/dashboard", requestUrl.origin)
      );
    }

    console.error("Auth callback error:", error);
  }

  return NextResponse.redirect(
    new URL("/login?error=auth_failed", requestUrl.origin)
  );
}
