"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import { AGENT_DISPLAY_NAMES } from "@/src/features/agents/constants";
import type { AgentId } from "@/src/features/agents/memory/types";

type TerminalLineVariant = "user" | "ai" | "system";

interface TerminalLineProps {
  variant: TerminalLineVariant;
  content: string;
  isStreaming?: boolean;
  agentId?: AgentId;
}

// Memoized for performance with many messages (F13 fix)
export const TerminalLine = memo(function TerminalLine({
  variant,
  content,
  isStreaming = false,
  agentId,
}: TerminalLineProps) {
  // Dynamic prefix for AI messages based on agent, fallback to 'coach'
  const getPrefix = () => {
    if (variant === "user") return "> ";
    if (variant === "system") return "SYSTEM: ";
    // AI variant - use dynamic agent name
    const displayName = AGENT_DISPLAY_NAMES[agentId ?? "coach"] ?? "Coach";
    return `${displayName.toUpperCase()}: `;
  };

  const prefix = getPrefix();

  return (
    <div
      className={cn("terminal-glow whitespace-pre-wrap break-words")}
      role={variant === "ai" ? "status" : undefined}
      aria-label={
        variant === "user"
          ? `You said: ${content}`
          : variant === "ai"
            ? `${AGENT_DISPLAY_NAMES[agentId ?? "coach"]} said: ${content}`
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
});

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
