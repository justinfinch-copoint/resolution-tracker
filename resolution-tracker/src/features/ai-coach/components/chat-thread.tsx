'use client';

import { useState, useEffect, useRef } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { ChatBubble } from './chat-bubble';
import { ChatInput } from './chat-input';
import { getTextFromParts } from '../types';
import { Loader2 } from 'lucide-react';

const WELCOME_MESSAGE = "Hey! I'm your resolution coach. What's on your mind today?";

// F7: Instantiate transport outside component to avoid recreation on each render
const chatTransport = new DefaultChatTransport({
  api: '/api/chat',
});

export function ChatThread() {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, error } = useChat({
    transport: chatTransport,
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    sendMessage({ text: trimmedInput });
    setInput('');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto">
          {/* Welcome message if no messages yet */}
          {messages.length === 0 && (
            <ChatBubble
              variant="ai"
              content={WELCOME_MESSAGE}
            />
          )}

          {/* Message list */}
          {messages.map((message) => {
            const content = getTextFromParts(message.parts);
            // Skip empty messages (can happen with tool-only responses)
            if (!content.trim()) return null;

            return (
              <ChatBubble
                key={message.id}
                variant={message.role === 'user' ? 'user' : 'ai'}
                content={content}
              />
            );
          })}

          {/* Streaming indicator */}
          {isLoading && messages.length > 0 && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Thinking...</span>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="bg-destructive/10 text-destructive rounded-xl p-4 mb-4">
              <p className="text-sm font-medium">Something went wrong</p>
              <p className="text-sm opacity-80 mt-1">
                {error.message || 'Failed to send message. Please try again.'}
              </p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <ChatInput
        value={input}
        onChange={setInput}
        onSend={handleSend}
        isLoading={isLoading}
      />
    </div>
  );
}
