"use client";

import { useState, useEffect, useRef, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && input.trim()) {
      router.push("/chat");
    }
    if (e.key === "Escape") {
      setInput("");
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 overflow-y-auto p-4">
        <div className="text-[var(--terminal-amber-dim)] terminal-glow">
          SETTINGS
        </div>
        <div className="text-[var(--terminal-amber-dim)] terminal-glow mb-4">
          ──────────────────────────────────────
        </div>

        <div className="text-[var(--terminal-amber)] terminal-glow">
          Settings coming soon.
        </div>

        <div className="text-[var(--terminal-amber-dim)] terminal-glow mt-4">
          ──────────────────────────────────────
        </div>
        <div className="text-[var(--terminal-amber-dim)] terminal-glow mt-2">
          Type anything to return to conversation.
        </div>
      </div>

      {/* Input area */}
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
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type to continue..."
          className={cn(
            "flex-1 bg-transparent border-none outline-none",
            "text-[var(--terminal-amber)] terminal-glow",
            "placeholder:text-[var(--terminal-amber-dim)] placeholder:opacity-50",
            "caret-[var(--terminal-amber)]"
          )}
          aria-label="Return to chat"
        />
        <button
          onClick={() => router.push("/chat")}
          className={cn(
            "px-4 py-2 text-sm",
            "border border-[var(--terminal-amber-dim)]",
            "text-[var(--terminal-amber-dim)]",
            "bg-transparent transition-all duration-150",
            "hover:border-[var(--terminal-amber)] hover:text-[var(--terminal-amber)] hover:terminal-glow",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--terminal-amber)]"
          )}
        >
          BACK
        </button>
      </div>
    </div>
  );
}
