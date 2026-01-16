"use client";

import { cn } from "@/lib/utils";
import { VALID_COMMANDS, type Command } from "@/lib/commands";

interface CommandBarProps {
  onCommand: (command: Command) => void;
  className?: string;
}

const commands = VALID_COMMANDS.map((cmd) => ({
  command: cmd,
  label: cmd,
}));

export function CommandBar({ onCommand, className }: CommandBarProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-4 px-4 py-2",
        "border-t border-[var(--terminal-border)]",
        "bg-[var(--terminal-bg)]",
        className
      )}
      role="navigation"
      aria-label="Quick commands"
    >
      {commands.map(({ command, label }) => (
        <button
          key={command}
          onClick={() => onCommand(command)}
          className={cn(
            "text-sm text-[var(--terminal-amber-dim)]",
            "bg-transparent border-none cursor-pointer",
            "transition-all duration-150",
            "hover:text-[var(--terminal-amber)] hover:terminal-glow",
            "focus-visible:outline-none focus-visible:text-[var(--terminal-amber)] focus-visible:terminal-glow"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
