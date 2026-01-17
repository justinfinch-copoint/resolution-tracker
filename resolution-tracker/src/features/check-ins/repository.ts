import { db, checkIns, CheckIn, goals } from '@/src/db';
import { eq, desc, and, between, sql, isNotNull } from 'drizzle-orm';
import type { CreateCheckInInputInternal } from './types';
import { DEFAULT_RECENT_LIMIT } from './types';
import { milestones } from '@/src/db';

/**
 * Get all check-ins for a user (ordered by createdAt desc)
 */
export async function getCheckInsByUserId(userId: string, limit?: number): Promise<CheckIn[]> {
  const query = db
    .select()
    .from(checkIns)
    .where(eq(checkIns.userId, userId))
    .orderBy(desc(checkIns.createdAt));

  if (limit) {
    return query.limit(limit);
  }
  return query;
}

/**
 * Get check-ins for a specific goal
 */
export async function getCheckInsByGoalId(goalId: string, userId: string, limit?: number): Promise<CheckIn[]> {
  const query = db
    .select()
    .from(checkIns)
    .where(and(eq(checkIns.goalId, goalId), eq(checkIns.userId, userId)))
    .orderBy(desc(checkIns.createdAt));

  if (limit) {
    return query.limit(limit);
  }
  return query;
}

/**
 * Get recent check-ins for AI context (sliding window)
 */
export async function getRecentCheckIns(userId: string, limit: number = DEFAULT_RECENT_LIMIT): Promise<CheckIn[]> {
  return db
    .select()
    .from(checkIns)
    .where(eq(checkIns.userId, userId))
    .orderBy(desc(checkIns.createdAt))
    .limit(limit);
}

/**
 * Get a single check-in by ID (filter by userId for security)
 */
export async function getCheckInById(id: string, userId: string): Promise<CheckIn | null> {
  const result = await db
    .select()
    .from(checkIns)
    .where(and(eq(checkIns.id, id), eq(checkIns.userId, userId)));

  return result[0] ?? null;
}

/**
 * Get habit check-ins for a period (for completion rate calculation)
 */
export async function getHabitCheckInsForPeriod(
  goalId: string,
  userId: string,
  startDate: string,
  endDate: string
): Promise<CheckIn[]> {
  return db
    .select()
    .from(checkIns)
    .where(
      and(
        eq(checkIns.goalId, goalId),
        eq(checkIns.userId, userId),
        between(checkIns.checkInDate, startDate, endDate),
        isNotNull(checkIns.habitCompletionStatus)
      )
    )
    .orderBy(checkIns.checkInDate);
}

/**
 * Get the latest check-in with a value recorded (for target progress)
 */
export async function getLatestValueCheckIn(goalId: string, userId: string): Promise<CheckIn | null> {
  const result = await db
    .select()
    .from(checkIns)
    .where(
      and(
        eq(checkIns.goalId, goalId),
        eq(checkIns.userId, userId),
        isNotNull(checkIns.valueRecorded)
      )
    )
    .orderBy(desc(checkIns.createdAt))
    .limit(1);

  return result[0] ?? null;
}

/**
 * Verify that a milestone belongs to the specified goal
 */
async function verifyMilestoneBelongsToGoal(milestoneId: string, goalId: string): Promise<boolean> {
  const result = await db
    .select({ id: milestones.id })
    .from(milestones)
    .where(and(eq(milestones.id, milestoneId), eq(milestones.goalId, goalId)));
  return result.length > 0;
}

/**
 * Create a new check-in record
 * Also updates goal's check_in_count and last_check_in_at
 * Validates milestoneId belongs to the same goal if provided
 */
export async function createCheckIn(userId: string, input: CreateCheckInInputInternal): Promise<CheckIn> {
  // Validate milestoneId belongs to the goal if provided
  if (input.milestoneId) {
    const isValidMilestone = await verifyMilestoneBelongsToGoal(input.milestoneId, input.goalId);
    if (!isValidMilestone) {
      throw new Error('Milestone does not belong to this goal');
    }
  }

  // Get today's date in YYYY-MM-DD format if not provided
  const checkInDate = input.checkInDate ?? new Date().toISOString().split('T')[0];

  const result = await db.transaction(async (tx) => {
    // Create the check-in
    const checkIn = await tx
      .insert(checkIns)
      .values({
        userId,
        goalId: input.goalId,
        content: input.content,
        aiResponse: input.aiResponse ?? null,
        milestoneId: input.milestoneId ?? null,
        valueRecorded: input.valueRecorded?.toString() ?? null,
        habitCompletionStatus: input.habitCompletionStatus ?? null,
        checkInDate,
      })
      .returning();

    // Update the goal's check-in count and last check-in timestamp
    await tx
      .update(goals)
      .set({
        checkInCount: sql`${goals.checkInCount} + 1`,
        lastCheckInAt: new Date(),
      })
      .where(eq(goals.id, input.goalId));

    return checkIn[0];
  });

  return result;
}

/**
 * Delete a check-in (for corrections)
 * Also decrements the goal's check_in_count
 */
export async function deleteCheckIn(id: string, userId: string): Promise<boolean> {
  // First get the check-in to know which goal to update
  const checkIn = await getCheckInById(id, userId);
  if (!checkIn) return false;

  const result = await db.transaction(async (tx) => {
    // Delete the check-in
    const deleted = await tx
      .delete(checkIns)
      .where(and(eq(checkIns.id, id), eq(checkIns.userId, userId)))
      .returning({ id: checkIns.id });

    if (deleted.length > 0) {
      // Decrement the goal's check-in count (ensure it doesn't go below 0)
      await tx
        .update(goals)
        .set({
          checkInCount: sql`GREATEST(${goals.checkInCount} - 1, 0)`,
        })
        .where(eq(goals.id, checkIn.goalId));
    }

    return deleted;
  });

  return result.length > 0;
}
