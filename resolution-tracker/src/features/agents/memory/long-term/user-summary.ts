/**
 * User Summary Repository
 *
 * CRUD operations for user summaries (patterns, wins, struggles).
 * Part of the long-term memory layer.
 */

import { db, userSummaries, UserSummary, UserSummaryData } from '@/src/db';
import { eq } from 'drizzle-orm';

/**
 * Get user summary by userId
 */
export async function getUserSummary(userId: string): Promise<UserSummary | null> {
  const result = await db
    .select()
    .from(userSummaries)
    .where(eq(userSummaries.userId, userId));

  return result[0] ?? null;
}

/**
 * Get user summary data (just the JSON, not the full record)
 */
export async function getUserSummaryData(userId: string): Promise<UserSummaryData | null> {
  const summary = await getUserSummary(userId);
  return summary?.summaryJson ?? null;
}

/**
 * Upsert user summary (create or replace)
 */
export async function upsertUserSummary(userId: string, data: UserSummaryData): Promise<UserSummary> {
  const summaryWithTimestamp: UserSummaryData = {
    ...data,
    lastUpdated: new Date().toISOString(),
  };

  const result = await db
    .insert(userSummaries)
    .values({
      userId,
      summaryJson: summaryWithTimestamp,
    })
    .onConflictDoUpdate({
      target: userSummaries.userId,
      set: {
        summaryJson: summaryWithTimestamp,
      },
    })
    .returning();

  return result[0];
}

/**
 * Merge new data into existing user summary (preserves existing data)
 */
export async function mergeUserSummary(
  userId: string,
  updates: Partial<Pick<UserSummaryData, 'patterns' | 'wins' | 'struggles'>>
): Promise<UserSummary> {
  const existing = await getUserSummaryData(userId);

  // Merge arrays, removing duplicates
  const mergedPatterns = existing?.patterns ?? [];
  const mergedWins = existing?.wins ?? [];
  const mergedStruggles = existing?.struggles ?? [];

  if (updates.patterns) {
    for (const pattern of updates.patterns) {
      if (!mergedPatterns.includes(pattern)) {
        mergedPatterns.push(pattern);
      }
    }
  }

  if (updates.wins) {
    for (const win of updates.wins) {
      if (!mergedWins.includes(win)) {
        mergedWins.push(win);
      }
    }
  }

  if (updates.struggles) {
    for (const struggle of updates.struggles) {
      if (!mergedStruggles.includes(struggle)) {
        mergedStruggles.push(struggle);
      }
    }
  }

  // Keep arrays from growing too large (keep most recent 20)
  const MAX_ITEMS = 20;
  const newData: UserSummaryData = {
    patterns: mergedPatterns.slice(-MAX_ITEMS),
    wins: mergedWins.slice(-MAX_ITEMS),
    struggles: mergedStruggles.slice(-MAX_ITEMS),
    lastUpdated: new Date().toISOString(),
  };

  return upsertUserSummary(userId, newData);
}
