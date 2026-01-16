"use client";

import { useRouter } from "next/navigation";
import { TerminalHeader, CommandBar } from "@/components/terminal";
import { executeCommand, type Command } from "@/lib/commands";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const handleCommand = async (command: Command) => {
    await executeCommand(command, {
      navigateTo: (path) => router.push(path),
      showHelp: () => router.push("/chat"), // Redirect to chat for help from command bar
    });
  };

  return (
    <div className="min-h-dvh flex justify-center bg-black p-0 lg:p-6">
      <div className="w-full max-w-[800px] min-h-dvh lg:min-h-[calc(100dvh-48px)] flex flex-col bg-[var(--terminal-bg)] relative lg:border lg:border-[var(--terminal-border)] crt-scanlines crt-vignette">
        <TerminalHeader />
        <main className="flex-1 flex flex-col overflow-hidden">
          {children}
        </main>
        <CommandBar onCommand={handleCommand} />
      </div>
    </div>
  );
}
