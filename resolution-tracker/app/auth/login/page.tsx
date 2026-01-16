import Link from "next/link";
import { LoginForm } from "@/components/login-form";

export default function Page() {
  return (
    <div className="min-h-dvh flex flex-col bg-[var(--terminal-bg)]">
      <header className="h-14 flex items-center px-4">
        <Link
          href="/"
          className="text-[var(--terminal-amber-dim)] hover:text-[var(--terminal-amber)] transition-colors terminal-glow"
        >
          &lt; Back
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 pb-14">
        <div className="w-full max-w-sm">
          <LoginForm />
        </div>
      </main>
    </div>
  );
}
