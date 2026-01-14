import type { Goal } from '@/src/db/schema';
import type { GoalResponse } from './types';
import { MAX_ACTIVE_GOALS } from './types';
import * as repository from './repository';

/**
 * Transform DB Goal (snake_case) to API GoalResponse (camelCase)
 * Dates are converted to ISO strings
 */
export function transformGoalToResponse(goal: Goal): GoalResponse {
  return {
    id: goal.id,
    userId: goal.userId,
    title: goal.title,
    status: goal.status,
    createdAt: goal.createdAt.toISOString(),
    updatedAt: goal.updatedAt.toISOString(),
  };
}

/**
 * Get all goals for a user, transformed to API format
 */
export async function getUserGoals(userId: string): Promise<GoalResponse[]> {
  const goals = await repository.getGoalsByUserId(userId);
  return goals.map(transformGoalToResponse);
}

/**
 * Get a single goal for a user, transformed to API format
 */
export async function getUserGoal(id: string, userId: string): Promise<GoalResponse | null> {
  const goal = await repository.getGoalById(id, userId);
  return goal ? transformGoalToResponse(goal) : null;
}

/**
 * Check if user can create a new goal (under the active limit)
 */
export async function canCreateGoal(userId: string): Promise<boolean> {
  const activeCount = await repository.getActiveGoalCount(userId);
  return activeCount < MAX_ACTIVE_GOALS;
}

/**
 * Check if user can activate a goal (under the active limit)
 */
export async function canActivateGoal(userId: string): Promise<boolean> {
  return canCreateGoal(userId);
}
