// Chat feature types
// Helpers for working with Vercel AI SDK v6 messages

import type { UIMessage } from 'ai';
import { isTextUIPart } from 'ai';

// Re-export AgentId from memory types (avoiding full agents import for client components)
export type { AgentId } from '@/src/features/agents/memory/types';

/**
 * Extract text content from a v6 UIMessage parts array.
 * Filters for TextUIPart and concatenates all text.
 */
export function getTextFromParts(parts: UIMessage['parts']): string {
  return parts
    .filter(isTextUIPart)
    .map((part) => part.text)
    .join('');
}
