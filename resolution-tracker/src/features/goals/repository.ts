import { db, goals, milestones, implementationIntentions, Goal } from '@/src/db';
import { eq, and, count, desc } from 'drizzle-orm';
import type { CreateGoalInput, UpdateGoalInput, ProgressSentimentValue } from './types';
import { MAX_ACTIVE_GOALS } from './types';

/**
 * Get all goals for a user (ordered by createdAt desc)
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
 * Get a goal with its related milestones and implementation intentions
 */
export async function getGoalWithRelations(id: string, userId: string): Promise<{
  goal: Goal;
  milestones: typeof milestones.$inferSelect[];
  implementationIntentions: typeof implementationIntentions.$inferSelect[];
} | null> {
  const goal = await getGoalById(id, userId);
  if (!goal) return null;

  const [goalMilestones, goalIntentions] = await Promise.all([
    db.select().from(milestones).where(eq(milestones.goalId, id)).orderBy(milestones.sortOrder),
    db.select().from(implementationIntentions).where(eq(implementationIntentions.goalId, id)),
  ]);

  return {
    goal,
    milestones: goalMilestones,
    implementationIntentions: goalIntentions,
  };
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
 * Create a new goal with atomic limit check
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
        goalType: input.goalType ?? 'habit',
        successCriteria: input.successCriteria ?? null,
        targetDate: input.targetDate ? new Date(input.targetDate) : null,
        whyItMatters: input.whyItMatters ?? null,
        currentBaseline: input.currentBaseline ?? null,
        recoveryPlan: input.recoveryPlan ?? null,
        targetValue: input.targetValue?.toString() ?? null,
        targetUnit: input.targetUnit ?? null,
        frequencyPerWeek: input.frequencyPerWeek ?? null,
      })
      .returning();
    return result[0];
  });
}

/**
 * Update a goal with atomic limit check for activation
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

    const updateData: Record<string, unknown> = {};
    if (input.title !== undefined) updateData.title = input.title;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.goalType !== undefined) updateData.goalType = input.goalType;
    if (input.successCriteria !== undefined) updateData.successCriteria = input.successCriteria;
    if (input.targetDate !== undefined) updateData.targetDate = input.targetDate ? new Date(input.targetDate) : null;
    if (input.whyItMatters !== undefined) updateData.whyItMatters = input.whyItMatters;
    if (input.currentBaseline !== undefined) updateData.currentBaseline = input.currentBaseline;
    if (input.recoveryPlan !== undefined) updateData.recoveryPlan = input.recoveryPlan;
    if (input.targetValue !== undefined) updateData.targetValue = input.targetValue?.toString() ?? null;
    if (input.targetUnit !== undefined) updateData.targetUnit = input.targetUnit;
    if (input.frequencyPerWeek !== undefined) updateData.frequencyPerWeek = input.frequencyPerWeek;
    if (input.progressSentiment !== undefined) updateData.progressSentiment = input.progressSentiment;

    const result = await tx
      .update(goals)
      .set(updateData)
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

/**
 * Update progress sentiment for a goal
 * Typically called by AI coach based on conversation analysis
 */
export async function updateProgressSentiment(
  goalId: string,
  userId: string,
  sentiment: ProgressSentimentValue
): Promise<Goal | null> {
  const result = await db
    .update(goals)
    .set({ progressSentiment: sentiment })
    .where(and(eq(goals.id, goalId), eq(goals.userId, userId)))
    .returning();
  return result[0] ?? null;
}
