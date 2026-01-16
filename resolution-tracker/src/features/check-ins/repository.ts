import { db, checkIns, CheckIn } from '@/src/db';
import { eq, desc, and } from 'drizzle-orm';
import type { CreateCheckInInput } from './types';
import { DEFAULT_RECENT_LIMIT } from './types';

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
 * Get a single check-in by ID (F2: filter by userId in WHERE for security)
 */
export async function getCheckInById(id: string, userId: string): Promise<CheckIn | null> {
  const result = await db
    .select()
    .from(checkIns)
    .where(and(eq(checkIns.id, id), eq(checkIns.userId, userId)));

  return result[0] ?? null;
}

/**
 * Create a new check-in record
 */
export async function createCheckIn(userId: string, input: CreateCheckInInput): Promise<CheckIn> {
  const result = await db
    .insert(checkIns)
    .values({
      userId,
      goalId: input.goalId,
      content: input.content,
      aiResponse: input.aiResponse ?? null,
    })
    .returning();

  return result[0];
}
