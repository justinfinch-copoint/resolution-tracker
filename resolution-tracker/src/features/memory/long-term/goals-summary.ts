import { db, goals, goalTypeEnum } from '@/src/db';
import { eq, and, desc } from 'drizzle-orm';
import type { GoalSummary, GoalType } from '../types';

/**
 * Maximum number of goals to include in context.
 * Prevents context window overflow for users with many goals.
 */
const MAX_GOALS_FOR_CONTEXT = 10;

/** Valid goal types from schema enum */
const VALID_GOAL_TYPES = new Set<string>(goalTypeEnum.enumValues);

/**
 * Fetch active goals summary for context.
 * Returns lightweight goal data (id, title, status, goalType).
 * Limited to MAX_GOALS_FOR_CONTEXT most recent goals.
 */
export async function getGoalsSummary(userId: string): Promise<GoalSummary[]> {
  const userGoals = await db
    .select({
      id: goals.id,
      title: goals.title,
      status: goals.status,
      goalType: goals.goalType,
    })
    .from(goals)
    .where(and(eq(goals.userId, userId), eq(goals.status, 'active')))
    .orderBy(desc(goals.createdAt))
    .limit(MAX_GOALS_FOR_CONTEXT);

  return userGoals.map((g) => {
    // Runtime validation of goalType against schema enum
    const goalType: GoalType = VALID_GOAL_TYPES.has(g.goalType)
      ? (g.goalType as GoalType)
      : 'habit'; // Fallback to 'habit' if invalid (shouldn't happen with FK constraints)

    return {
      id: g.id,
      title: g.title,
      status: g.status,
      goalType,
    };
  });
}
