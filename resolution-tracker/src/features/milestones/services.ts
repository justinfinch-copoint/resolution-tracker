import * as repository from './repository';
import { transformMilestoneToResponse, getMilestonesForGoal } from './queries';
import { createMilestoneSchema, updateMilestoneSchema, type MilestoneResponse } from './types';
import type { ServiceResult } from '@/src/features/goals/services';

/**
 * Create a new milestone
 * - Validates input with Zod
 * - Verifies goal ownership
 * - Creates milestone via repository
 */
export async function createMilestoneService(
  goalId: string,
  userId: string,
  input: unknown
): Promise<ServiceResult<MilestoneResponse>> {
  // Validate input
  const parseResult = createMilestoneSchema.safeParse(input);
  if (!parseResult.success) {
    const firstError = parseResult.error.issues[0];
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: firstError.message },
    };
  }

  const validatedInput = parseResult.data;

  const milestone = await repository.createMilestone(goalId, userId, validatedInput);
  if (!milestone) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Goal not found or access denied' },
    };
  }

  return { success: true, data: transformMilestoneToResponse(milestone) };
}

/**
 * Update an existing milestone
 * - Validates input with Zod
 * - Verifies ownership
 * - Updates milestone via repository
 */
export async function updateMilestoneService(
  id: string,
  userId: string,
  input: unknown
): Promise<ServiceResult<MilestoneResponse>> {
  // Validate input
  const parseResult = updateMilestoneSchema.safeParse(input);
  if (!parseResult.success) {
    const firstError = parseResult.error.issues[0];
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: firstError.message },
    };
  }

  const validatedInput = parseResult.data;

  const milestone = await repository.updateMilestone(id, userId, validatedInput);
  if (!milestone) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Milestone not found or access denied' },
    };
  }

  return { success: true, data: transformMilestoneToResponse(milestone) };
}

/**
 * Mark a milestone as complete (idempotent)
 */
export async function completeMilestoneService(
  id: string,
  userId: string
): Promise<ServiceResult<MilestoneResponse>> {
  const milestone = await repository.completeMilestone(id, userId);
  if (!milestone) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Milestone not found or access denied' },
    };
  }

  return { success: true, data: transformMilestoneToResponse(milestone) };
}

/**
 * Get a single milestone by ID
 */
export async function getMilestoneService(
  id: string,
  userId: string
): Promise<ServiceResult<MilestoneResponse>> {
  const milestone = await repository.getMilestoneById(id, userId);
  if (!milestone) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Milestone not found or access denied' },
    };
  }

  return { success: true, data: transformMilestoneToResponse(milestone) };
}

/**
 * List all milestones for a goal
 * - Verifies goal ownership via queries (getMilestonesForGoal)
 */
export async function listMilestonesService(
  goalId: string,
  userId: string
): Promise<ServiceResult<MilestoneResponse[]>> {
  const milestones = await getMilestonesForGoal(goalId, userId);

  if (milestones === null) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Goal not found or access denied' },
    };
  }

  return { success: true, data: milestones };
}

/**
 * Delete a milestone
 */
export async function deleteMilestoneService(
  id: string,
  userId: string
): Promise<ServiceResult<{ deleted: true }>> {
  const deleted = await repository.deleteMilestone(id, userId);
  if (!deleted) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Milestone not found or access denied' },
    };
  }

  return { success: true, data: { deleted: true } };
}
