export { getUserProfile } from './user-profile';
export { getGoalsSummary } from './goals-summary';
export { getEngagementContext } from './engagement';
export {
  getUserSummary,
  getUserSummaryData,
  upsertUserSummary,
  mergeUserSummary,
} from './user-summary';

import { getUserProfile } from './user-profile';
import { getGoalsSummary } from './goals-summary';
import { getEngagementContext } from './engagement';
import { getUserSummaryData } from './user-summary';
import type { LongTermMemory } from '../types';
import { userIdSchema } from '../types';

/** Error thrown when profile is not found for a userId */
export class ProfileNotFoundError extends Error {
  constructor(userId: string) {
    super(`Profile not found for userId: ${userId}`);
    this.name = 'ProfileNotFoundError';
  }
}

/** Result type for fetchLongTermMemory (consistent with ServiceResult pattern) */
export type LongTermMemoryResult =
  | { success: true; data: LongTermMemory }
  | { success: false; error: { code: string; message: string } };

/**
 * Fetch all long-term memory in parallel.
 * Returns ServiceResult pattern for consistent error handling.
 *
 * @throws Never - errors are captured in result object
 */
export async function fetchLongTermMemory(userId: string): Promise<LongTermMemoryResult> {
  // Validate userId format
  const validation = userIdSchema.safeParse(userId);
  if (!validation.success) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: validation.error.issues[0].message },
    };
  }

  try {
    const [userProfile, goals, userSummaryData, engagement] = await Promise.all([
      getUserProfile(userId),
      getGoalsSummary(userId),
      getUserSummaryData(userId),
      getEngagementContext(userId),
    ]);

    // F7: Throw explicit error instead of fabricating data when profile missing
    if (!userProfile) {
      return {
        success: false,
        error: { code: 'PROFILE_NOT_FOUND', message: `Profile not found for userId: ${userId}` },
      };
    }

    return {
      success: true,
      data: {
        userProfile,
        goals,
        userSummary: userSummaryData
          ? {
              patterns: userSummaryData.patterns ?? [],
              wins: userSummaryData.wins ?? [],
              struggles: userSummaryData.struggles ?? [],
              lastUpdated: userSummaryData.lastUpdated ?? null,
            }
          : null,
        engagement,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: err instanceof Error ? err.message : 'Unknown database error',
      },
    };
  }
}
