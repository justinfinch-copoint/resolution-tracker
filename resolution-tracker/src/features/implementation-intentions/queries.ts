import type { ImplementationIntention } from '@/src/db/schema';
import type { ImplementationIntentionResponse } from './types';
import * as repository from './repository';
import { getGoalById } from '@/src/features/goals/repository';

/**
 * Transform DB ImplementationIntention to API response (camelCase)
 * Dates are converted to ISO strings
 */
export function transformIntentionToResponse(intention: ImplementationIntention): ImplementationIntentionResponse {
  return {
    id: intention.id,
    goalId: intention.goalId,
    triggerCondition: intention.triggerCondition,
    action: intention.action,
    isActive: intention.isActive,
    createdAt: intention.createdAt.toISOString(),
  };
}

/**
 * Get intentions for a goal, validated and transformed
 */
export async function getIntentionsForGoal(goalId: string, userId: string): Promise<ImplementationIntentionResponse[] | null> {
  // Verify user owns the goal
  const goal = await getGoalById(goalId, userId);
  if (!goal) return null;

  const intentions = await repository.getIntentionsByGoalId(goalId);
  return intentions.map(transformIntentionToResponse);
}

/**
 * Get active intentions for a goal (for AI coach context)
 */
export async function getActiveIntentionsForGoal(goalId: string, userId: string): Promise<ImplementationIntentionResponse[] | null> {
  // Verify user owns the goal
  const goal = await getGoalById(goalId, userId);
  if (!goal) return null;

  const intentions = await repository.getIntentionsByGoalId(goalId);
  const activeIntentions = intentions.filter((i) => i.isActive);
  return activeIntentions.map(transformIntentionToResponse);
}

/**
 * Get a single intention, transformed to API format
 */
export async function getIntention(id: string, userId: string): Promise<ImplementationIntentionResponse | null> {
  const intention = await repository.getIntentionById(id, userId);
  return intention ? transformIntentionToResponse(intention) : null;
}
