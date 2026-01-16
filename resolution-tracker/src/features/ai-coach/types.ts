// Re-export DB types for user summaries
export type { UserSummary, NewUserSummary, UserSummaryData } from '@/src/db/schema';

// Re-export check-in types for convenience
export type { CheckInResponse } from '@/src/features/check-ins/types';

// Re-export goal types for context building
export type { GoalResponse } from '@/src/features/goals/types';

// V6 UI Message types from Vercel AI SDK
import type { UIMessage, TextUIPart } from 'ai';
import { isTextUIPart } from 'ai';
export type { UIMessage, TextUIPart };
export { isTextUIPart };

// Chat context for AI prompts
export type ChatContext = {
  userId: string;
  goals: Array<{
    id: string;
    title: string;
    status: string;
  }>;
  recentCheckIns: Array<{
    id: string;
    goalId: string | null;
    content: string;
    aiResponse: string | null;
    createdAt: string;
  }>;
  userSummary: {
    patterns: string[];
    wins: string[];
    struggles: string[];
    lastUpdated: string | null;
  } | null;
};

// Tool result types
export type RecordCheckInResult = {
  success: boolean;
  checkInId: string;
  message: string;
};

export type UpdateSummaryResult = {
  success: boolean;
  message: string;
};

export type MarkGoalCompleteResult = {
  success: boolean;
  goalId: string;
  message: string;
};

// Helper to extract text from v6 message parts
export function getTextFromParts(parts: UIMessage['parts']): string {
  return parts
    .filter(isTextUIPart)
    .map((part) => part.text)
    .join('');
}
