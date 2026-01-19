import { db, checkIns } from '@/src/db';
import { eq, desc } from 'drizzle-orm';
import type { EngagementContext } from '../types';

/**
 * Threshold for determining engagement status.
 * Users who checked in within this many days are considered "engaged".
 * Users beyond this threshold are "returning" (need re-engagement prompts).
 *
 * Rationale: 3 days aligns with habit formation research suggesting that
 * gaps longer than 72 hours significantly increase dropout risk.
 */
const ENGAGEMENT_THRESHOLD_DAYS = 3;

/**
 * Calculate user engagement status based on check-in history
 * Returns days since last check-in and engagement status
 */
export async function getEngagementContext(userId: string): Promise<EngagementContext> {
  // Get most recent check-in
  const [lastCheckIn] = await db
    .select({ createdAt: checkIns.createdAt })
    .from(checkIns)
    .where(eq(checkIns.userId, userId))
    .orderBy(desc(checkIns.createdAt))
    .limit(1);

  if (!lastCheckIn) {
    return {
      daysSinceLastCheckIn: null,
      status: 'new',
      lastCheckInAt: null,
    };
  }

  const daysSince = Math.floor(
    (Date.now() - lastCheckIn.createdAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    daysSinceLastCheckIn: daysSince,
    status: daysSince <= ENGAGEMENT_THRESHOLD_DAYS ? 'engaged' : 'returning',
    lastCheckInAt: lastCheckIn.createdAt.toISOString(),
  };
}
