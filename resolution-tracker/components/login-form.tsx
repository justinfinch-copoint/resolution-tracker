"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
        },
      });
      if (error) throw error;
      router.push("/auth/check-email");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="border border-[var(--terminal-border)] bg-[var(--terminal-bg-light)] p-6">
        <div className="mb-6">
          <h1 className="text-xl text-[var(--terminal-amber-bright)] terminal-glow-strong mb-2">
            SIGN IN
          </h1>
          <p className="text-[var(--terminal-amber-dim)]">
            Enter your email to receive a magic link
          </p>
        </div>
        <form onSubmit={handleLogin}>
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="email"
                className="text-[var(--terminal-amber)] terminal-glow"
              >
                EMAIL:
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={cn(
                  "w-full px-3 py-2",
                  "bg-[var(--terminal-bg)] border border-[var(--terminal-border)]",
                  "text-[var(--terminal-amber)] terminal-glow",
                  "placeholder:text-[var(--terminal-amber-dim)] placeholder:opacity-50",
                  "caret-[var(--terminal-amber)]",
                  "focus:outline-none focus:border-[var(--terminal-amber)]"
                )}
              />
            </div>
            {error && (
              <p className="text-sm text-destructive terminal-glow">
                ERROR: {error}
              </p>
            )}
            <button
              type="submit"
              disabled={isLoading}
              className={cn(
                "w-full px-4 py-3",
                "border border-[var(--terminal-amber)]",
                "text-[var(--terminal-amber)] terminal-glow",
                "bg-transparent transition-all duration-150",
                "hover:bg-[var(--terminal-amber)] hover:text-[var(--terminal-bg)]",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--terminal-amber)]"
              )}
            >
              {isLoading ? "SENDING LINK..." : "SEND MAGIC LINK"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
