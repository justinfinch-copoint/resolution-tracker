import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LoginForm } from "@/components/login-form";

export default function Page() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="h-14 flex items-center px-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back</span>
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
