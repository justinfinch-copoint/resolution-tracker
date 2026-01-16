"use client";

import { useState, useEffect, useCallback, KeyboardEvent, useRef } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { GoalResponse } from "../types";

export function TerminalGoalList() {
  const router = useRouter();
  const [goals, setGoals] = useState<GoalResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchGoals = useCallback(async () => {
    try {
      const response = await fetch("/api/goals");
      if (!response.ok) {
        throw new Error("Failed to fetch goals");
      }
      const data = await response.json();
      setGoals(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && input.trim()) {
      // Any input returns to chat
      router.push("/chat");
    }
    if (e.key === "Escape") {
      setInput("");
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "[active]";
      case "completed":
        return "[done]";
      case "paused":
        return "[paused]";
      case "abandoned":
        return "[abandoned]";
      default:
        return `[${status}]`;
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col p-4">
        <div className="text-[var(--terminal-amber)] terminal-glow">
          Loading goals...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col p-4">
        <div className="text-[var(--terminal-amber-dim)] terminal-glow">
          SYSTEM: Error loading goals - {error}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 overflow-y-auto p-4">
        <div className="text-[var(--terminal-amber-dim)] terminal-glow">
          YOUR GOALS
        </div>
        <div className="text-[var(--terminal-amber-dim)] terminal-glow mb-4">
          ──────────────────────────────────────
        </div>

        {goals.length === 0 ? (
          <div className="text-[var(--terminal-amber)] terminal-glow">
            No goals yet. Chat with me to set your first one.
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {goals.map((goal) => (
              <div
                key={goal.id}
                className={cn(
                  "flex gap-2 terminal-glow",
                  goal.status === "completed" && "opacity-70"
                )}
              >
                <span
                  className={cn(
                    goal.status === "completed"
                      ? "text-[var(--terminal-amber-bright)]"
                      : "text-[var(--terminal-amber-dim)]"
                  )}
                >
                  {getStatusLabel(goal.status)}
                </span>
                <span
                  className={cn(
                    "text-[var(--terminal-amber)]",
                    goal.status === "completed" && "line-through"
                  )}
                >
                  {goal.title}
                  {goal.status === "completed" && " ✓"}
                </span>
              </div>
            ))}
          </div>
        )}

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
