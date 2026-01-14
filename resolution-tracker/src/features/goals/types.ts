// Re-export DB types
export type { Goal, NewGoal, GoalStatus } from '@/src/db/schema';

// API input types
export type CreateGoalInput = { title: string };
export type UpdateGoalInput = { title?: string; status?: import('@/src/db/schema').GoalStatus };

// API response type (camelCase for API layer)
export type GoalResponse = {
  id: string;
  userId: string;
  title: string;
  status: import('@/src/db/schema').GoalStatus;
  createdAt: string;
  updatedAt: string;
};

// Constants
export const MAX_ACTIVE_GOALS = 5;
export const MIN_ACTIVE_GOALS = 2;
export const MAX_TITLE_LENGTH = 500;

// Centralized status definitions (F14: single source of truth)
export const GOAL_STATUSES = ['active', 'completed', 'paused', 'abandoned'] as const;
export type GoalStatusValue = (typeof GOAL_STATUSES)[number];

export const STATUS_CONFIG: Record<GoalStatusValue, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: 'Active', variant: 'default' },
  completed: { label: 'Completed', variant: 'secondary' },
  paused: { label: 'Paused', variant: 'outline' },
  abandoned: { label: 'Abandoned', variant: 'destructive' },
};

// Validation helpers
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}

export function isValidStatus(status: string): status is GoalStatusValue {
  return GOAL_STATUSES.includes(status as GoalStatusValue);
}
