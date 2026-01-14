// app/auth/callback/route.ts
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/dashboard";

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Redirect to the dashboard or specified next URL
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }

    console.error("Auth callback error:", error);
  }

  // Redirect to login with error
  return NextResponse.redirect(
    new URL("/login?error=auth_failed", requestUrl.origin)
  );
}
