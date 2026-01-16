import type { ChatContext } from './types';
import { getRecentUserCheckIns } from '@/src/features/check-ins/queries';
import { getUserGoals } from '@/src/features/goals/queries';
import { getUserSummaryData } from './summary-repository';

const DEFAULT_CHECK_IN_LIMIT = 15;

/**
 * Build the complete chat context for AI prompts
 * Fetches: recent check-ins, user summary, active goals
 */
export async function buildChatContext(userId: string): Promise<ChatContext> {
  // Fetch all data in parallel for performance
  const [recentCheckIns, goals, summaryData] = await Promise.all([
    getRecentUserCheckIns(userId, DEFAULT_CHECK_IN_LIMIT),
    getUserGoals(userId),
    getUserSummaryData(userId),
  ]);

  // Filter to active goals only for context
  const activeGoals = goals
    .filter((g) => g.status === 'active')
    .map((g) => ({
      id: g.id,
      title: g.title,
      status: g.status,
    }));

  // Transform check-ins for context (already in API format from queries)
  const checkInsForContext = recentCheckIns.map((c) => ({
    id: c.id,
    goalId: c.goalId,
    content: c.content,
    aiResponse: c.aiResponse,
    createdAt: c.createdAt,
  }));

  // Build user summary for context
  const userSummary = summaryData
    ? {
        patterns: summaryData.patterns ?? [],
        wins: summaryData.wins ?? [],
        struggles: summaryData.struggles ?? [],
        lastUpdated: summaryData.lastUpdated ?? null,
      }
    : null;

  return {
    userId,
    goals: activeGoals,
    recentCheckIns: checkInsForContext,
    userSummary,
  };
}
