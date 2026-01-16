// Re-export DB types
export type { CheckIn, NewCheckIn } from '@/src/db/schema';

// Re-export shared validation from goals (F5: avoid duplication)
export { isValidUUID } from '@/src/features/goals/types';

// API input types
export type CreateCheckInInput = {
  goalId: string | null;
  content: string;
  aiResponse?: string;
};

// API response type (camelCase for API layer)
export type CheckInResponse = {
  id: string;
  userId: string;
  goalId: string | null;
  content: string;
  aiResponse: string | null;
  createdAt: string;
};

// Constants
export const MAX_CHECK_IN_LENGTH = 2000;
export const DEFAULT_RECENT_LIMIT = 15;
