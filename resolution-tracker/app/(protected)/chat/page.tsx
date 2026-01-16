'use client';

import dynamic from 'next/dynamic';

const ChatThread = dynamic(
  () => import('@/src/features/ai-coach/components/chat-thread').then(mod => mod.ChatThread),
  { ssr: false }
);

export default function ChatPage() {
  return (
    <div className="w-full h-[calc(100vh-64px)] -my-6 -mx-4 px-0">
      <ChatThread />
    </div>
  );
}
