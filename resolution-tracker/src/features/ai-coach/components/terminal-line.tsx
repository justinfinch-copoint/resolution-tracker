"use client";

import { cn } from "@/lib/utils";

type TerminalLineVariant = "user" | "ai" | "system";

interface TerminalLineProps {
  variant: TerminalLineVariant;
  content: string;
  isStreaming?: boolean;
}

export function TerminalLine({
  variant,
  content,
  isStreaming = false,
}: TerminalLineProps) {
  const prefixMap: Record<TerminalLineVariant, string> = {
    user: "> ",
    ai: "COACH: ",
    system: "SYSTEM: ",
  };

  const prefix = prefixMap[variant];

  return (
    <div
      className={cn("terminal-glow whitespace-pre-wrap break-words")}
      role={variant === "ai" ? "status" : undefined}
      aria-label={
        variant === "user"
          ? `You said: ${content}`
          : variant === "ai"
            ? `Coach said: ${content}`
            : undefined
      }
    >
      <span
        className={cn(
          variant === "user" && "text-[var(--terminal-amber-dim)]",
          variant === "ai" && "text-[var(--terminal-amber-bright)] font-medium",
          variant === "system" && "text-[var(--terminal-amber-dim)]"
        )}
      >
        {prefix}
      </span>
      <span
        className={cn(
          "text-[var(--terminal-amber)]",
          variant === "system" && "text-[var(--terminal-amber-dim)]"
        )}
      >
        {renderContent(content)}
      </span>
      {isStreaming && (
        <span
          className="inline-block w-[0.6em] h-[1.1em] bg-[var(--terminal-amber)] ml-0.5 align-text-bottom cursor-blink"
          aria-hidden="true"
        />
      )}
    </div>
  );
}

function renderContent(content: string) {
  // Simple markdown-like rendering for bold and italic
  const parts = content.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-medium">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}
