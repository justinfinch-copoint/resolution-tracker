import { createClient } from "@/lib/supabase/server";
import { db } from "@/src/db";
import { profiles } from "@/src/db/schema";
import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/protected";

  const supabase = await createClient();

  // Handle PKCE flow (magic link with code parameter)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      redirect(`/auth/error?error=${encodeURIComponent(error.message)}`);
    }
  }

  // Handle OTP verification flow (token_hash and type parameters)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (error) {
      redirect(`/auth/error?error=${encodeURIComponent(error.message)}`);
    }
  }

  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    // Create profile if it doesn't exist (idempotent)
    try {
      await db
        .insert(profiles)
        .values({ id: user.id, email: user.email })
        .onConflictDoNothing();
    } catch {
      // Profile creation is non-blocking - user can still proceed
    }

    redirect(next);
  }

  redirect(`/auth/error?error=${encodeURIComponent("Authentication failed. Please try signing in again.")}`);
}
