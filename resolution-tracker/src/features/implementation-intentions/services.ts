import * as repository from './repository';
import { transformIntentionToResponse, getIntentionsForGoal } from './queries';
import { createIntentionSchema, updateIntentionSchema, type ImplementationIntentionResponse } from './types';
import type { ServiceResult } from '@/src/features/goals/services';

/**
 * Create a new implementation intention ("If X, then Y" plan)
 * - Validates input with Zod
 * - Verifies goal ownership
 * - Creates intention via repository
 */
export async function createIntentionService(
  goalId: string,
  userId: string,
  input: unknown
): Promise<ServiceResult<ImplementationIntentionResponse>> {
  // Validate input
  const parseResult = createIntentionSchema.safeParse(input);
  if (!parseResult.success) {
    const firstError = parseResult.error.issues[0];
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: firstError.message },
    };
  }

  const validatedInput = parseResult.data;

  const intention = await repository.createIntention(goalId, userId, validatedInput);
  if (!intention) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Goal not found or access denied' },
    };
  }

  return { success: true, data: transformIntentionToResponse(intention) };
}

/**
 * Update an existing implementation intention
 * - Validates input with Zod
 * - Verifies ownership
 * - Updates intention via repository
 */
export async function updateIntentionService(
  id: string,
  userId: string,
  input: unknown
): Promise<ServiceResult<ImplementationIntentionResponse>> {
  // Validate input
  const parseResult = updateIntentionSchema.safeParse(input);
  if (!parseResult.success) {
    const firstError = parseResult.error.issues[0];
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: firstError.message },
    };
  }

  const validatedInput = parseResult.data;

  const intention = await repository.updateIntention(id, userId, validatedInput);
  if (!intention) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Intention not found or access denied' },
    };
  }

  return { success: true, data: transformIntentionToResponse(intention) };
}

/**
 * Toggle an intention's active status
 */
export async function toggleIntentionService(
  id: string,
  userId: string
): Promise<ServiceResult<ImplementationIntentionResponse>> {
  const intention = await repository.toggleIntentionActive(id, userId);
  if (!intention) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Intention not found or access denied' },
    };
  }

  return { success: true, data: transformIntentionToResponse(intention) };
}

/**
 * Get a single intention by ID
 */
export async function getIntentionService(
  id: string,
  userId: string
): Promise<ServiceResult<ImplementationIntentionResponse>> {
  const intention = await repository.getIntentionById(id, userId);
  if (!intention) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Intention not found or access denied' },
    };
  }

  return { success: true, data: transformIntentionToResponse(intention) };
}

/**
 * List all intentions for a goal
 * - Verifies goal ownership via queries
 */
export async function listIntentionsService(
  goalId: string,
  userId: string
): Promise<ServiceResult<ImplementationIntentionResponse[]>> {
  const intentions = await getIntentionsForGoal(goalId, userId);

  if (intentions === null) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Goal not found or access denied' },
    };
  }

  return { success: true, data: intentions };
}

/**
 * Delete an implementation intention
 */
export async function deleteIntentionService(
  id: string,
  userId: string
): Promise<ServiceResult<{ deleted: true }>> {
  const deleted = await repository.deleteIntention(id, userId);
  if (!deleted) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Intention not found or access denied' },
    };
  }

  return { success: true, data: { deleted: true } };
}
