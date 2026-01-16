import type { CheckIn } from '@/src/db/schema';
import type { CheckInResponse } from './types';
import * as repository from './repository';

/**
 * Transform DB CheckIn (snake_case) to API CheckInResponse (camelCase)
 * Dates are converted to ISO strings
 */
export function transformCheckInToResponse(checkIn: CheckIn): CheckInResponse {
  return {
    id: checkIn.id,
    userId: checkIn.userId,
    goalId: checkIn.goalId,
    content: checkIn.content,
    aiResponse: checkIn.aiResponse,
    createdAt: checkIn.createdAt.toISOString(),
  };
}

/**
 * Get all check-ins for a user, transformed to API format
 */
export async function getUserCheckIns(userId: string, limit?: number): Promise<CheckInResponse[]> {
  const checkIns = await repository.getCheckInsByUserId(userId, limit);
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
