"use client";

import { KeyboardEvent, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { parseCommand, type Command } from "@/lib/commands";

const MAX_MESSAGE_LENGTH = 4000;

type ChatInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onCommand?: (command: Command) => void;
  isLoading?: boolean;
  placeholder?: string;
};

export function ChatInput({
  value,
  onChange,
  onSend,
  onCommand,
  isLoading = false,
  placeholder = "Type a message...",
}: ChatInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || isLoading) return;

    // Check if it's a command
    const command = parseCommand(trimmed);
    if (command && onCommand) {
      onCommand(command);
      onChange("");
      return;
    }

    onSend();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && value.trim() && !isLoading) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape") {
      onChange("");
    }
  };

  const handleSend = () => {
    handleSubmit();
  };

  const canSend = value.trim().length > 0 && !isLoading;

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-4 py-4",
        "bg-[var(--terminal-bg-light)] border-t border-[var(--terminal-border)]"
      )}
    >
      <span className="text-[var(--terminal-amber-dim)] terminal-glow flex-shrink-0">
        &gt;
      </span>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isLoading}
        maxLength={MAX_MESSAGE_LENGTH}
        className={cn(
          "flex-1 bg-transparent border-none outline-none",
          "text-[var(--terminal-amber)] terminal-glow",
          "placeholder:text-[var(--terminal-amber-dim)] placeholder:opacity-50",
          "caret-[var(--terminal-amber)]",
          "disabled:opacity-50"
        )}
        aria-label="Message input"
      />
      <button
        onClick={handleSend}
        disabled={!canSend}
        className={cn(
          "px-4 py-2 text-sm",
          "border border-[var(--terminal-amber-dim)]",
          "text-[var(--terminal-amber-dim)]",
          "bg-transparent transition-all duration-150",
          "hover:border-[var(--terminal-amber)] hover:text-[var(--terminal-amber)] hover:terminal-glow",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-[var(--terminal-amber-dim)] disabled:hover:text-[var(--terminal-amber-dim)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--terminal-amber)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--terminal-bg)]"
        )}
      >
        SEND
      </button>
    </div>
  );
}
