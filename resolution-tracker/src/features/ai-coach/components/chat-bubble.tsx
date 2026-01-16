'use client';

import { cn } from '@/lib/utils';
import { Bot } from 'lucide-react';

type ChatBubbleProps = {
  variant: 'user' | 'ai';
  content: string;
  timestamp?: string;
};

export function ChatBubble({ variant, content, timestamp }: ChatBubbleProps) {
  const isUser = variant === 'user';

  return (
    <div
      className={cn(
        'flex w-full mb-4',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'flex max-w-[85%] gap-2',
          isUser ? 'flex-row-reverse' : 'flex-row'
        )}
      >
        {!isUser && (
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <Bot className="w-4 h-4 text-muted-foreground" />
          </div>
        )}
        <div
          className={cn(
            'px-4 py-3 rounded-2xl',
            isUser
              ? 'bg-[#E59500] text-white rounded-br-md'
              : 'bg-[#FAF8F5] text-foreground rounded-bl-md'
          )}
        >
          <div className="text-sm whitespace-pre-wrap break-words prose prose-sm max-w-none">
            {renderContent(content)}
          </div>
          {timestamp && (
            <div
              className={cn(
                'text-xs mt-1 opacity-70',
                isUser ? 'text-white/70' : 'text-muted-foreground'
              )}
            >
              {formatTime(timestamp)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function renderContent(content: string) {
  // Simple markdown-like rendering for bold and italic
  const parts = content.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

function formatTime(timestamp: string) {
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}
