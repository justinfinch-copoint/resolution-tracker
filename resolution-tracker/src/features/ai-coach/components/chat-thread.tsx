"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { TerminalLine } from "./terminal-line";
import { ChatInput } from "./chat-input";
import { getTextFromParts } from "../types";
import { executeCommand, type Command } from "@/lib/commands";

const FALLBACK_GREETING =
  "Hey! I'm your resolution coach. What's on your mind today?";

const GREETING_TIMEOUT_MS = 5000;

// Instantiate transport outside component to avoid recreation on each render
const chatTransport = new DefaultChatTransport({
  api: "/api/chat",
});

export function ChatThread() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [greeting, setGreeting] = useState(FALLBACK_GREETING);
  const [greetingLoading, setGreetingLoading] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, error } = useChat({
    transport: chatTransport,
  });

  const isLoading = status === "streaming" || status === "submitted";
  const isStreaming = status === "streaming";

  // Fetch dynamic greeting on mount with timeout (F7, F15)
  useEffect(() => {
    const abortController = new AbortController();
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    async function fetchGreeting() {
      // Set timeout to fallback after GREETING_TIMEOUT_MS
      timeoutId = setTimeout(() => {
        if (isMounted) {
          setGreetingLoading(false);
        }
      }, GREETING_TIMEOUT_MS);

      try {
        const response = await fetch("/api/chat/greeting", {
          signal: abortController.signal,
        });
        if (response.ok && isMounted) {
          const data = await response.json();
          if (data.greeting && isMounted) {
            setGreeting(data.greeting);
          }
        }
      } catch (error) {
        // Only log if not an abort error
        if (error instanceof Error && error.name !== "AbortError") {
          console.warn("Failed to fetch greeting:", error.message);
        }
      } finally {
        if (isMounted) {
          clearTimeout(timeoutId);
          setGreetingLoading(false);
        }
      }
    }
    fetchGreeting();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      abortController.abort();
    };
  }, []);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    // Hide help when sending a message
    setShowHelp(false);

    sendMessage({ text: trimmedInput });
    setInput("");
  };

  const handleCommand = async (command: Command) => {
    await executeCommand(command, {
      navigateTo: (path) => router.push(path),
      showHelp: () => setShowHelp(true),
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4">
        <div
          className="flex flex-col gap-4"
          role="log"
          aria-live="polite"
          aria-busy={isStreaming}
        >
          {/* Welcome message if no messages yet */}
          {messages.length === 0 && (
            <TerminalLine
              variant="ai"
              content={greetingLoading ? "..." : greeting}
            />
          )}

          {/* Message list */}
          {messages.map((message, index) => {
            const content = getTextFromParts(message.parts);
            // Skip empty messages (can happen with tool-only responses)
            if (!content.trim()) return null;

            const isLastAiMessage =
              message.role === "assistant" &&
              index === messages.length - 1 &&
              isStreaming;

            return (
              <TerminalLine
                key={message.id}
                variant={message.role === "user" ? "user" : "ai"}
                content={content}
                isStreaming={isLastAiMessage}
              />
            );
          })}

          {/* Help display */}
          {showHelp && (
            <div className="border border-[var(--terminal-amber-dim)] p-4 my-2">
              <div className="text-[var(--terminal-amber-bright)] mb-2 terminal-glow">
                AVAILABLE COMMANDS
              </div>
              <div className="text-[var(--terminal-amber)]">
                <div className="my-1">
                  <span className="text-[var(--terminal-amber-bright)]">
                    /goals
                  </span>
                  <span className="text-[var(--terminal-amber-dim)]">
                    {" "}
                    — View your current goals
                  </span>
                </div>
                <div className="my-1">
                  <span className="text-[var(--terminal-amber-bright)]">
                    /settings
                  </span>
                  <span className="text-[var(--terminal-amber-dim)]">
                    {" "}
                    — Manage integrations & preferences
                  </span>
                </div>
                <div className="my-1">
                  <span className="text-[var(--terminal-amber-bright)]">
                    /help
                  </span>
                  <span className="text-[var(--terminal-amber-dim)]">
                    {" "}
                    — Show this help message
                  </span>
                </div>
                <div className="my-1">
                  <span className="text-[var(--terminal-amber-bright)]">
                    /signout
                  </span>
                  <span className="text-[var(--terminal-amber-dim)]">
                    {" "}
                    — Sign out of your account
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Error state */}
          {error && (
            <TerminalLine
              variant="system"
              content={`Error: ${error.message || "Failed to send message. Please try again."}`}
            />
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <ChatInput
        value={input}
        onChange={setInput}
        onSend={handleSend}
        onCommand={handleCommand}
        isLoading={isLoading}
      />
    </div>
  );
}
