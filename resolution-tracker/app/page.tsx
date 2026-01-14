import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-[600px] flex flex-col items-center text-center gap-8">
        <div className="flex flex-col gap-4">
          <h1 className="text-3xl font-bold text-foreground">
            Keep your resolutions, your way
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Your friendly companion for building habits that stick. No guilt, just gentle nudges to help you stay on track.
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/auth/login">Get Started</Link>
        </Button>
      </div>
    </main>
  );
}
