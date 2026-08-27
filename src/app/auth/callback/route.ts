import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Receives the `code` from Supabase's PKCE email links (password reset in
// forgot-password, signup confirmation, invite emails) and exchanges it for
// a session before handing off to `next`. Without this exchange the caller
// (e.g. /reset-password calling supabase.auth.updateUser()) has no session
// to act on.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
