"use client";

import dynamic from "next/dynamic";
import { ChatErrorBoundary } from "@/src/features/chat";

const ChatThread = dynamic(
  () =>
    import("@/src/features/chat").then(
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
