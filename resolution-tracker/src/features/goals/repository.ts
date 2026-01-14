import { db, goals, Goal } from '@/src/db';
import { eq, and, count, desc } from 'drizzle-orm';
import type { CreateGoalInput, UpdateGoalInput } from './types';
import { MAX_ACTIVE_GOALS } from './types';

/**
 * Get all goals for a user (F9: ordered by createdAt desc)
 */
export async function getGoalsByUserId(userId: string): Promise<Goal[]> {
  return db
    .select()
    .from(goals)
    .where(eq(goals.userId, userId))
    .orderBy(desc(goals.createdAt));
}

/**
 * Get a single goal by ID (filtered by userId for security)
 */
export async function getGoalById(id: string, userId: string): Promise<Goal | null> {
  const result = await db
    .select()
    .from(goals)
    .where(and(eq(goals.id, id), eq(goals.userId, userId)));
  return result[0] ?? null;
}

/**
 * Get count of active goals for a user
 */
export async function getActiveGoalCount(userId: string): Promise<number> {
  const result = await db
    .select({ count: count() })
    .from(goals)
    .where(and(eq(goals.userId, userId), eq(goals.status, 'active')));
  return result[0]?.count ?? 0;
}

/**
 * Create a new goal with atomic limit check (F4: prevents race condition)
 * Uses transaction to check count and insert atomically
 */
export async function createGoal(userId: string, input: CreateGoalInput): Promise<Goal> {
  return db.transaction(async (tx) => {
    // Check count within transaction
    const countResult = await tx
      .select({ count: count() })
      .from(goals)
      .where(and(eq(goals.userId, userId), eq(goals.status, 'active')));

    const activeCount = countResult[0]?.count ?? 0;
    if (activeCount >= MAX_ACTIVE_GOALS) {
      throw new Error('MAX_GOALS_REACHED');
    }

    const result = await tx
      .insert(goals)
      .values({
        userId,
        title: input.title,
        status: 'active',
      })
      .returning();
    return result[0];
  });
}

/**
 * Update a goal with atomic limit check for activation (F5: prevents race condition)
 */
export async function updateGoal(
  id: string,
  userId: string,
  input: UpdateGoalInput
): Promise<Goal | null> {
  return db.transaction(async (tx) => {
    // If activating, check limit within transaction
    if (input.status === 'active') {
      const existingGoal = await tx
        .select()
        .from(goals)
        .where(and(eq(goals.id, id), eq(goals.userId, userId)));

      if (existingGoal[0] && existingGoal[0].status !== 'active') {
        const countResult = await tx
          .select({ count: count() })
          .from(goals)
          .where(and(eq(goals.userId, userId), eq(goals.status, 'active')));

        const activeCount = countResult[0]?.count ?? 0;
        if (activeCount >= MAX_ACTIVE_GOALS) {
          throw new Error('MAX_GOALS_REACHED');
        }
      }
    }

    const result = await tx
      .update(goals)
      .set({
        ...(input.title !== undefined && { title: input.title }),
        ...(input.status !== undefined && { status: input.status }),
      })
      .where(and(eq(goals.id, id), eq(goals.userId, userId)))
      .returning();
    return result[0] ?? null;
  });
}

/**
 * Delete a goal
 */
export async function deleteGoal(id: string, userId: string): Promise<boolean> {
  const result = await db
    .delete(goals)
    .where(and(eq(goals.id, id), eq(goals.userId, userId)))
    .returning({ id: goals.id });
  return result.length > 0;
}
