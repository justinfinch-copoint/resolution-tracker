"use client";

import {
  KeyboardEvent,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { cn } from "@/lib/utils";

interface TerminalInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  showSendButton?: boolean;
  className?: string;
  autoFocus?: boolean;
}

export const TerminalInput = forwardRef<HTMLInputElement, TerminalInputProps>(
  function TerminalInput(
    {
      value,
      onChange,
      onSubmit,
      placeholder = "Type a message...",
      disabled = false,
      showSendButton = true,
      className,
      autoFocus = true,
    },
    ref
  ) {
    const internalRef = useRef<HTMLInputElement>(null);

    // Properly forward ref to support both callback and object refs
    useImperativeHandle(ref, () => internalRef.current!, []);

    useEffect(() => {
      if (autoFocus && internalRef.current) {
        internalRef.current.focus();
      }
    }, [autoFocus]);

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && value.trim() && !disabled) {
        e.preventDefault();
        onSubmit(value.trim());
      }
      if (e.key === "Escape") {
        onChange("");
      }
    };

    const handleSend = () => {
      if (value.trim() && !disabled) {
        onSubmit(value.trim());
      }
    };

    return (
      <div
        className={cn(
          "flex items-center gap-2 px-4 py-4",
          "bg-[var(--terminal-bg-light)] border-t border-[var(--terminal-border)]",
          className
        )}
      >
        <span className="text-[var(--terminal-amber-dim)] terminal-glow flex-shrink-0">
          &gt;
        </span>
        <input
          ref={internalRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "flex-1 bg-transparent border-none outline-none",
            "text-[var(--terminal-amber)] terminal-glow",
            "placeholder:text-[var(--terminal-amber-dim)] placeholder:opacity-50",
            "caret-[var(--terminal-amber)]",
            "disabled:opacity-50"
          )}
          aria-label="Message input"
        />
        {showSendButton && (
          <button
            onClick={handleSend}
            disabled={disabled || !value.trim()}
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
        )}
      </div>
    );
  }
);
