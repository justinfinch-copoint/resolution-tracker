import type { Milestone } from '@/src/db/schema';
import type { MilestoneResponse } from './types';
import * as repository from './repository';
import { getGoalById } from '@/src/features/goals/repository';

/**
 * Transform DB Milestone to API MilestoneResponse (camelCase)
 * Dates are converted to ISO strings
 */
export function transformMilestoneToResponse(milestone: Milestone): MilestoneResponse {
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
 * Get milestones for a goal, validated and transformed
 */
export async function getMilestonesForGoal(goalId: string, userId: string): Promise<MilestoneResponse[] | null> {
  // Verify user owns the goal
  const goal = await getGoalById(goalId, userId);
  if (!goal) return null;

  const milestones = await repository.getMilestonesByGoalId(goalId);
  return milestones.map(transformMilestoneToResponse);
}

/**
 * Get a single milestone, transformed to API format
 */
export async function getMilestone(id: string, userId: string): Promise<MilestoneResponse | null> {
  const milestone = await repository.getMilestoneById(id, userId);
  return milestone ? transformMilestoneToResponse(milestone) : null;
}

/**
 * Calculate milestone progress for a goal (completed / total)
 * Returns percentage (0-100) or null if no milestones
 */
export async function calculateMilestoneProgress(goalId: string): Promise<number | null> {
  const milestones = await repository.getMilestonesByGoalId(goalId);

  if (milestones.length === 0) return null;

  const completed = milestones.filter((m) => m.completedAt !== null).length;
  return Math.round((completed / milestones.length) * 100);
}
