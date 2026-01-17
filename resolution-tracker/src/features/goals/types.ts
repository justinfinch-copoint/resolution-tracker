import { z } from 'zod';

// Re-export DB types
export type { Goal, NewGoal, GoalStatus, GoalType, ProgressSentiment } from '@/src/db/schema';

// Constants
export const MAX_ACTIVE_GOALS = 5;
export const MIN_ACTIVE_GOALS = 2;
export const MAX_TITLE_LENGTH = 500;

// Centralized status definitions
export const GOAL_STATUSES = ['active', 'completed', 'paused', 'abandoned'] as const;
export type GoalStatusValue = (typeof GOAL_STATUSES)[number];

// Goal types
export const GOAL_TYPES = ['habit', 'target', 'project'] as const;
export type GoalTypeValue = (typeof GOAL_TYPES)[number];

// Progress sentiments
export const PROGRESS_SENTIMENTS = ['behind', 'on_track', 'ahead'] as const;
export type ProgressSentimentValue = (typeof PROGRESS_SENTIMENTS)[number];

export const STATUS_CONFIG: Record<GoalStatusValue, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: 'Active', variant: 'default' },
  completed: { label: 'Completed', variant: 'secondary' },
  paused: { label: 'Paused', variant: 'outline' },
  abandoned: { label: 'Abandoned', variant: 'destructive' },
};

// Zod schemas for API validation
export const createGoalSchema = z.object({
  title: z.string().min(1, 'Title is required').max(MAX_TITLE_LENGTH, `Title must be ${MAX_TITLE_LENGTH} characters or less`),
  goalType: z.enum(GOAL_TYPES).optional().default('habit'),
  successCriteria: z.string().nullable().optional(),
  targetDate: z.string().datetime().nullable().optional(),
  whyItMatters: z.string().nullable().optional(),
  currentBaseline: z.string().nullable().optional(),
  recoveryPlan: z.string().nullable().optional(),
  targetValue: z.number().nullable().optional(),
  targetUnit: z.string().nullable().optional(),
  frequencyPerWeek: z.number().int().min(1).max(7).nullable().optional(),
});

export const updateGoalSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty').max(MAX_TITLE_LENGTH, `Title must be ${MAX_TITLE_LENGTH} characters or less`).optional(),
  status: z.enum(GOAL_STATUSES).optional(),
  goalType: z.enum(GOAL_TYPES).optional(),
  successCriteria: z.string().nullable().optional(),
  targetDate: z.string().datetime().nullable().optional(),
  whyItMatters: z.string().nullable().optional(),
  currentBaseline: z.string().nullable().optional(),
  recoveryPlan: z.string().nullable().optional(),
  targetValue: z.number().nullable().optional(),
  targetUnit: z.string().nullable().optional(),
  frequencyPerWeek: z.number().int().min(1).max(7).nullable().optional(),
  progressSentiment: z.enum(PROGRESS_SENTIMENTS).nullable().optional(),
});

// Infer types from schemas
export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;

// API response type (camelCase for API layer)
export type GoalResponse = {
  id: string;
  userId: string;
  title: string;
  status: GoalStatusValue;
  goalType: GoalTypeValue;
  successCriteria: string | null;
  targetDate: string | null;
  whyItMatters: string | null;
  currentBaseline: string | null;
  recoveryPlan: string | null;
  targetValue: number | null;
  targetUnit: string | null;
  frequencyPerWeek: number | null;
  progressSentiment: ProgressSentimentValue | null;
  checkInCount: number;
  lastCheckInAt: string | null;
  createdAt: string;
  updatedAt: string;
};

// Extended response with relations
export type GoalWithRelationsResponse = GoalResponse & {
  milestones: import('../milestones/types').MilestoneResponse[];
  implementationIntentions: import('../implementation-intentions/types').ImplementationIntentionResponse[];
};

// Validation helpers
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}

export function isValidStatus(status: string): status is GoalStatusValue {
  return GOAL_STATUSES.includes(status as GoalStatusValue);
}

export function isValidGoalType(goalType: string): goalType is GoalTypeValue {
  return GOAL_TYPES.includes(goalType as GoalTypeValue);
}

export function isValidProgressSentiment(sentiment: string): sentiment is ProgressSentimentValue {
  return PROGRESS_SENTIMENTS.includes(sentiment as ProgressSentimentValue);
}
