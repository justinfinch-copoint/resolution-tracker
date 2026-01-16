"use client";

import dynamic from "next/dynamic";
import { ChatErrorBoundary } from "@/src/features/ai-coach/components/chat-error-boundary";

const ChatThread = dynamic(
  () =>
    import("@/src/features/ai-coach/components/chat-thread").then(
      (mod) => mod.ChatThread
    ),
  { ssr: false }
);

export default function ChatPage() {
  return (
    <ChatErrorBoundary>
      <ChatThread />
    </ChatErrorBoundary>
  );
}
