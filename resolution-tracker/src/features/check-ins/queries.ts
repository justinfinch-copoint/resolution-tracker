import type { CheckIn } from '@/src/db/schema';
import type { CheckInResponse, HabitCompletionStatusValue } from './types';
import * as repository from './repository';
import { getGoalById } from '@/src/features/goals/repository';

/**
 * Transform DB CheckIn to API CheckInResponse (camelCase)
 * Dates are converted to ISO strings
 */
export function transformCheckInToResponse(checkIn: CheckIn): CheckInResponse {
  return {
    id: checkIn.id,
    userId: checkIn.userId,
    goalId: checkIn.goalId,
    content: checkIn.content,
    aiResponse: checkIn.aiResponse,
    milestoneId: checkIn.milestoneId,
    valueRecorded: checkIn.valueRecorded ? parseFloat(checkIn.valueRecorded) : null,
    habitCompletionStatus: checkIn.habitCompletionStatus as HabitCompletionStatusValue | null,
    checkInDate: checkIn.checkInDate,
    createdAt: checkIn.createdAt.toISOString(),
  };
}

/**
 * Get check-in history for a goal, transformed to API format
 */
export async function getCheckInHistory(goalId: string, userId: string): Promise<CheckInResponse[]> {
  const checkIns = await repository.getCheckInsByGoalId(goalId, userId);
  return checkIns.map(transformCheckInToResponse);
}

/**
 * Get all check-ins for a user, transformed to API format
 * Optionally filter by goalId
 */
export async function getUserCheckIns(userId: string, goalId?: string): Promise<CheckInResponse[]> {
  const checkIns = goalId
    ? await repository.getCheckInsByGoalId(goalId, userId)
    : await repository.getCheckInsByUserId(userId);
  return checkIns.map(transformCheckInToResponse);
}

/**
 * Get recent check-ins for AI context, transformed to API format
 */
export async function getRecentUserCheckIns(userId: string, limit?: number): Promise<CheckInResponse[]> {
  const checkIns = await repository.getRecentCheckIns(userId, limit);
  return checkIns.map(transformCheckInToResponse);
}

/**
 * Get a single check-in for a user, transformed to API format
 */
export async function getUserCheckIn(id: string, userId: string): Promise<CheckInResponse | null> {
  const checkIn = await repository.getCheckInById(id, userId);
  return checkIn ? transformCheckInToResponse(checkIn) : null;
}

/**
 * Calculate habit completion rate for a period
 * Skips are counted as neutral (not included in completion calculation)
 * Returns percentage (0-100) or null if no relevant check-ins
 */
export async function calculateHabitCompletionRate(
  goalId: string,
  userId: string,
  startDate: string,
  endDate: string
): Promise<number | null> {
  const checkIns = await repository.getHabitCheckInsForPeriod(goalId, userId, startDate, endDate);

  if (checkIns.length === 0) return null;

  // Count completed and missed (skips are neutral)
  let completed = 0;
  let missed = 0;

  for (const checkIn of checkIns) {
    if (checkIn.habitCompletionStatus === 'completed') {
      completed++;
    } else if (checkIn.habitCompletionStatus === 'missed') {
      missed++;
    }
    // 'skipped' is intentionally not counted
  }

  const total = completed + missed;
  if (total === 0) return null;

  return Math.round((completed / total) * 100);
}

/**
 * Calculate target progress (current value / target value)
 * Returns percentage (0-100+) or null if no target or value recorded
 */
export async function calculateTargetProgress(goalId: string, userId: string): Promise<number | null> {
  // Get the goal to find target value
  const goal = await getGoalById(goalId, userId);
  if (!goal || !goal.targetValue) return null;

  const targetValue = parseFloat(goal.targetValue);
  if (targetValue === 0) return null;

  // Get the latest value check-in
  const latestCheckIn = await repository.getLatestValueCheckIn(goalId, userId);
  if (!latestCheckIn || !latestCheckIn.valueRecorded) return null;

  const currentValue = parseFloat(latestCheckIn.valueRecorded);
  return Math.round((currentValue / targetValue) * 100);
}
