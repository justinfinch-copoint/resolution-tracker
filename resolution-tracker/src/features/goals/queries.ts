import type { Goal, Milestone, ImplementationIntention } from '@/src/db/schema';
import type { GoalResponse, GoalWithRelationsResponse, GoalTypeValue, ProgressSentimentValue } from './types';
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
    goalType: goal.goalType as GoalTypeValue,
    successCriteria: goal.successCriteria,
    targetDate: goal.targetDate?.toISOString() ?? null,
    whyItMatters: goal.whyItMatters,
    currentBaseline: goal.currentBaseline,
    recoveryPlan: goal.recoveryPlan,
    targetValue: goal.targetValue ? parseFloat(goal.targetValue) : null,
    targetUnit: goal.targetUnit,
    frequencyPerWeek: goal.frequencyPerWeek,
    progressSentiment: goal.progressSentiment as ProgressSentimentValue | null,
    checkInCount: goal.checkInCount,
    lastCheckInAt: goal.lastCheckInAt?.toISOString() ?? null,
    createdAt: goal.createdAt.toISOString(),
    updatedAt: goal.updatedAt.toISOString(),
  };
}

/**
 * Transform milestone to response format
 */
function transformMilestoneToResponse(milestone: Milestone) {
  return {
    id: milestone.id,
    goalId: milestone.goalId,
    title: milestone.title,
    description: milestone.description,
    targetDate: milestone.targetDate?.toISOString() ?? null,
    sortOrder: milestone.sortOrder,
    completedAt: milestone.completedAt?.toISOString() ?? null,
    createdAt: milestone.createdAt.toISOString(),
  };
}

/**
 * Transform implementation intention to response format
 */
function transformIntentionToResponse(intention: ImplementationIntention) {
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
 * Transform goal with relations to response format
 */
export function transformGoalWithRelationsToResponse(
  goal: Goal,
  milestones: Milestone[],
  intentions: ImplementationIntention[]
): GoalWithRelationsResponse {
  return {
    ...transformGoalToResponse(goal),
    milestones: milestones.map(transformMilestoneToResponse),
    implementationIntentions: intentions.map(transformIntentionToResponse),
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
 * Get a single goal with its relations, transformed to API format
 */
export async function getUserGoalWithRelations(id: string, userId: string): Promise<GoalWithRelationsResponse | null> {
  const result = await repository.getGoalWithRelations(id, userId);
  if (!result) return null;

  return transformGoalWithRelationsToResponse(
    result.goal,
    result.milestones,
    result.implementationIntentions
  );
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
