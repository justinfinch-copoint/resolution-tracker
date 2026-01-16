"use client";

import { cn } from "@/lib/utils";

interface TerminalHeaderProps {
  title?: string;
  className?: string;
}

export function TerminalHeader({
  title = "RESOLUTION TRACKER v1.0",
  className,
}: TerminalHeaderProps) {
  return (
    <header
      className={cn(
        "flex items-center justify-between px-4 py-3",
        "bg-[var(--terminal-bg-light)] border-b border-[var(--terminal-border)]",
        className
      )}
    >
      <span className="text-[var(--terminal-amber-bright)] font-medium terminal-glow">
        {title}
      </span>
      <div className="flex gap-2 text-[var(--terminal-amber-dim)]">
        <span aria-hidden="true">[—]</span>
        <span aria-hidden="true">[□]</span>
        <span aria-hidden="true">[×]</span>
      </div>
    </header>
  );
}
