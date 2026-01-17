import * as repository from './repository';
import { transformGoalToResponse, transformGoalWithRelationsToResponse } from './queries';
import {
  createGoalSchema,
  updateGoalSchema,
  type GoalResponse,
  type GoalWithRelationsResponse,
  MAX_ACTIVE_GOALS,
} from './types';

/**
 * Service result type for consistent error handling
 * Used by both API routes and AI tools
 */
export type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

/**
 * Create a new goal
 * - Validates input with Zod
 * - Checks active goal limit
 * - Creates goal via repository
 */
export async function createGoalService(
  userId: string,
  input: unknown
): Promise<ServiceResult<GoalResponse>> {
  // Validate input
  const parseResult = createGoalSchema.safeParse(input);
  if (!parseResult.success) {
    const firstError = parseResult.error.issues[0];
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: firstError.message },
    };
  }

  const validatedInput = parseResult.data;

  try {
    const goal = await repository.createGoal(userId, validatedInput);
    return { success: true, data: transformGoalToResponse(goal) };
  } catch (err) {
    if (err instanceof Error && err.message === 'MAX_GOALS_REACHED') {
      return {
        success: false,
        error: {
          code: 'MAX_GOALS_REACHED',
          message: `Maximum active goals reached (${MAX_ACTIVE_GOALS})`,
        },
      };
    }
    throw err;
  }
}

/**
 * Update an existing goal
 * - Validates input with Zod
 * - Handles activation limit check
 * - Updates goal via repository
 */
export async function updateGoalService(
  id: string,
  userId: string,
  input: unknown
): Promise<ServiceResult<GoalResponse>> {
  // Validate input
  const parseResult = updateGoalSchema.safeParse(input);
  if (!parseResult.success) {
    const firstError = parseResult.error.issues[0];
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: firstError.message },
    };
  }

  const validatedInput = parseResult.data;

  try {
    const goal = await repository.updateGoal(id, userId, validatedInput);
    if (!goal) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Goal not found' },
      };
    }
    return { success: true, data: transformGoalToResponse(goal) };
  } catch (err) {
    if (err instanceof Error && err.message === 'MAX_GOALS_REACHED') {
      return {
        success: false,
        error: {
          code: 'MAX_GOALS_REACHED',
          message: `Maximum active goals reached (${MAX_ACTIVE_GOALS})`,
        },
      };
    }
    throw err;
  }
}

/**
 * Pause a goal (set status to 'paused')
 * Non-punitive pause allows users to take breaks
 */
export async function pauseGoalService(
  id: string,
  userId: string
): Promise<ServiceResult<GoalResponse>> {
  const goal = await repository.updateGoal(id, userId, { status: 'paused' });
  if (!goal) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Goal not found' },
    };
  }
  return { success: true, data: transformGoalToResponse(goal) };
}

/**
 * Resume a goal (set status to 'active')
 * Checks active limit before resuming
 */
export async function resumeGoalService(
  id: string,
  userId: string
): Promise<ServiceResult<GoalResponse>> {
  try {
    const goal = await repository.updateGoal(id, userId, { status: 'active' });
    if (!goal) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Goal not found' },
      };
    }
    return { success: true, data: transformGoalToResponse(goal) };
  } catch (err) {
    if (err instanceof Error && err.message === 'MAX_GOALS_REACHED') {
      return {
        success: false,
        error: {
          code: 'MAX_GOALS_REACHED',
          message: `Maximum active goals reached (${MAX_ACTIVE_GOALS}). Pause or complete another goal first.`,
        },
      };
    }
    throw err;
  }
}

/**
 * Get a single goal by ID
 */
export async function getGoalService(
  id: string,
  userId: string
): Promise<ServiceResult<GoalResponse>> {
  const goal = await repository.getGoalById(id, userId);
  if (!goal) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Goal not found' },
    };
  }
  return { success: true, data: transformGoalToResponse(goal) };
}

/**
 * Get a single goal with its relations (milestones, intentions)
 */
export async function getGoalWithRelationsService(
  id: string,
  userId: string
): Promise<ServiceResult<GoalWithRelationsResponse>> {
  const result = await repository.getGoalWithRelations(id, userId);
  if (!result) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Goal not found' },
    };
  }
  return {
    success: true,
    data: transformGoalWithRelationsToResponse(
      result.goal,
      result.milestones,
      result.implementationIntentions
    ),
  };
}

/**
 * List all goals for a user
 */
export async function listGoalsService(
  userId: string
): Promise<ServiceResult<GoalResponse[]>> {
  const goals = await repository.getGoalsByUserId(userId);
  return { success: true, data: goals.map(transformGoalToResponse) };
}

/**
 * Delete a goal
 */
export async function deleteGoalService(
  id: string,
  userId: string
): Promise<ServiceResult<{ deleted: true }>> {
  const deleted = await repository.deleteGoal(id, userId);
  if (!deleted) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Goal not found' },
    };
  }
  return { success: true, data: { deleted: true } };
}
