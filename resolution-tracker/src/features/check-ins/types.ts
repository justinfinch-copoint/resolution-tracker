import { z } from 'zod';

// Re-export DB types
export type { CheckIn, NewCheckIn, HabitCompletionStatus } from '@/src/db/schema';

// Re-export shared validation from goals
export { isValidUUID } from '@/src/features/goals/types';

// Constants
export const MAX_CHECK_IN_LENGTH = 2000;
export const DEFAULT_RECENT_LIMIT = 15;

// Habit completion statuses
export const HABIT_COMPLETION_STATUSES = ['completed', 'skipped', 'missed'] as const;
export type HabitCompletionStatusValue = (typeof HABIT_COMPLETION_STATUSES)[number];

// Zod schemas for API validation
export const createCheckInSchema = z.object({
  goalId: z.string().uuid('Invalid goal ID format'),
  content: z.string().min(1, 'Content is required').max(MAX_CHECK_IN_LENGTH, `Content must be ${MAX_CHECK_IN_LENGTH} characters or less`),
  milestoneId: z.string().uuid('Invalid milestone ID format').nullable().optional(),
  valueRecorded: z.number().nullable().optional(),
  habitCompletionStatus: z.enum(HABIT_COMPLETION_STATUSES).nullable().optional(),
  checkInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
});

// API input types (inferred from Zod)
export type CreateCheckInInput = z.infer<typeof createCheckInSchema>;

// Legacy input type for AI coach (still supports null goalId internally but API requires it)
export type CreateCheckInInputInternal = {
  goalId: string;
  content: string;
  aiResponse?: string;
  milestoneId?: string | null;
  valueRecorded?: number | null;
  habitCompletionStatus?: HabitCompletionStatusValue | null;
  checkInDate?: string;
};

// API response type (camelCase for API layer)
export type CheckInResponse = {
  id: string;
  userId: string;
  goalId: string;
  content: string;
  aiResponse: string | null;
  milestoneId: string | null;
  valueRecorded: number | null;
  habitCompletionStatus: HabitCompletionStatusValue | null;
  checkInDate: string;
  createdAt: string;
};

// Validation helpers
export function isValidHabitCompletionStatus(status: string): status is HabitCompletionStatusValue {
  return HABIT_COMPLETION_STATUSES.includes(status as HabitCompletionStatusValue);
}
