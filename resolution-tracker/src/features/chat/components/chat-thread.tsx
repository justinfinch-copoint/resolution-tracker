"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { TerminalLine } from "./terminal-line";
import { ChatInput } from "./chat-input";
import { getTextFromParts } from "../types";
import type { AgentId } from "../types";
import { executeCommand, type Command } from "@/lib/commands";

const FALLBACK_GREETING =
  "Hey! I'm your resolution coach. What's on your mind today?";

const GREETING_TIMEOUT_MS = 5000;

// Session message type from server
interface SessionMessage {
  role: "user" | "assistant";
  content: string;
  agentId: AgentId;
  timestamp: string;
}

interface SessionResponse {
  session: {
    id: string;
    activeAgent: AgentId;
    messages: SessionMessage[];
  } | null;
}

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
  const [activeAgent, setActiveAgent] = useState<AgentId>("coach");
  const [messageAgents, setMessageAgents] = useState<Map<string, AgentId>>(
    new Map()
  );
  const [pendingHandoffContinuation, setPendingHandoffContinuation] =
    useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevStatusRef = useRef<string>("ready");
  const prevActiveAgentRef = useRef<AgentId>("coach");

  const { messages, setMessages, sendMessage, status, error } = useChat({
    transport: chatTransport,
  });

  const isLoading = status === "streaming" || status === "submitted";
  const isStreaming = status === "streaming";
  const [sessionLoaded, setSessionLoaded] = useState(false);

  // Load session on mount to restore conversation history
  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      try {
        const response = await fetch("/api/chat/session");
        if (!response.ok || !isMounted) return;

        const data: SessionResponse = await response.json();
        if (!data.session || !isMounted) {
          setSessionLoaded(true);
          return;
        }

        // Update active agent from session
        const sessionAgent = data.session.activeAgent;
        setActiveAgent(sessionAgent);
        prevActiveAgentRef.current = sessionAgent;

        // Restore messages if session has any
        const sessionMessages = data.session.messages;
        if (sessionMessages.length > 0) {
          // Convert session messages to UI message format
          const uiMessages = sessionMessages.map((msg, idx) => ({
            id: `restored-${idx}`,
            role: msg.role as "user" | "assistant",
            parts: [{ type: "text" as const, text: msg.content }],
            createdAt: new Date(msg.timestamp),
          }));

          // Build agent attribution map
          const agentMap = new Map<string, AgentId>();
          sessionMessages.forEach((msg, idx) => {
            if (msg.role === "assistant") {
              agentMap.set(`restored-${idx}`, msg.agentId);
            }
          });

          setMessages(uiMessages);
          setMessageAgents(agentMap);
        }

        setSessionLoaded(true);
      } catch (err) {
        console.warn("Failed to load session:", err);
        setSessionLoaded(true);
      }
    }

    loadSession();

    return () => {
      isMounted = false;
    };
  }, [setMessages]);

  // Fetch session to get accurate agent attribution after streaming
  const fetchSessionForAttribution = useCallback(async () => {
    try {
      const response = await fetch("/api/chat/session");
      if (!response.ok) return;

      const data: SessionResponse = await response.json();
      if (!data.session) return;

      // Update active agent
      const newActiveAgent = data.session.activeAgent;
      const previousAgent = prevActiveAgentRef.current;

      // Detect handoff: active agent changed
      if (newActiveAgent !== previousAgent) {
        console.log(`[Handoff detected] ${previousAgent} → ${newActiveAgent}`);
        setActiveAgent(newActiveAgent);
        prevActiveAgentRef.current = newActiveAgent;
        // Flag that we need to trigger continuation from new agent
        setPendingHandoffContinuation(true);
      }

      // Build message agents map from session data
      // Session messages are in order, map by index to UI message IDs
      const sessionMessages = data.session.messages;
      setMessageAgents((prev) => {
        const next = new Map(prev);
        // Match session messages to UI messages by index
        // Session has all messages, UI messages array may match
        messages.forEach((uiMsg, idx) => {
          if (uiMsg.role === "assistant" && sessionMessages[idx]) {
            next.set(uiMsg.id, sessionMessages[idx].agentId);
          }
        });
        return next;
      });
    } catch (err) {
      console.warn("Failed to fetch session:", err);
    }
  }, [messages]);

  // Fetch session after streaming completes to get accurate agent attribution
  useEffect(() => {
    const prevStatus = prevStatusRef.current;
    prevStatusRef.current = status;

    // When streaming completes (status goes from 'streaming' to 'ready')
    if (prevStatus === "streaming" && status === "ready") {
      fetchSessionForAttribution();
    }
  }, [status, fetchSessionForAttribution]);

  // Handle handoff continuation - new agent introduces themselves
  useEffect(() => {
    if (pendingHandoffContinuation && !isLoading) {
      setPendingHandoffContinuation(false);
      // Send a continuation message to trigger the new agent's introduction
      // Using a brief prompt that signals handoff context
      sendMessage({ text: "[continue]" });
    }
  }, [pendingHandoffContinuation, isLoading, sendMessage]);

  // Clean up messageAgents map when messages change
  useEffect(() => {
    const currentMessageIds = new Set(messages.map((m) => m.id));

    setMessageAgents((prev) => {
      const next = new Map(prev);

      // Clean up entries for messages that no longer exist (F12 fix)
      for (const [id] of next) {
        if (!currentMessageIds.has(id)) {
          next.delete(id);
        }
      }

      return next;
    });
  }, [messages]);

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
          } else if (isMounted) {
            console.warn("Greeting API returned unexpected response:", data);
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
          {/* Welcome message if no messages yet (after session loaded) */}
          {messages.length === 0 && (
            <TerminalLine
              variant="ai"
              content={!sessionLoaded || greetingLoading ? "..." : greeting}
              agentId="coach"
            />
          )}

          {/* Message list */}
          {messages.map((message, index) => {
            const content = getTextFromParts(message.parts);
            // Skip empty messages (can happen with tool-only responses)
            if (!content.trim()) return null;
            // Hide continuation trigger messages (used for handoff flow)
            if (content === "[continue]") return null;

            const isLastAiMessage =
              message.role === "assistant" &&
              index === messages.length - 1 &&
              isStreaming;

            // Get the agent for this message, default to current activeAgent
            const msgAgentId = messageAgents.get(message.id) ?? activeAgent;

            return (
              <TerminalLine
                key={message.id}
                variant={message.role === "user" ? "user" : "ai"}
                content={content}
                isStreaming={isLastAiMessage}
                agentId={message.role === "assistant" ? msgAgentId : undefined}
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
