/**
 * Coach Greeting Builder
 *
 * Generates context-aware initial greetings based on user's
 * goals, check-ins, and engagement status.
 */

import type { ChatContext } from '../memory/chat-context';

type EngagementStatus = 'new' | 'engaged' | 'returning';

/** Days since last check-in to consider user "engaged" vs "returning" */
const ENGAGEMENT_THRESHOLD_DAYS = 3;

/**
 * Calculate user engagement status based on check-in history
 */
function getEngagementStatus(context: ChatContext): EngagementStatus {
  if (context.recentCheckIns.length === 0) return 'new';
  const lastCheckIn = new Date(context.recentCheckIns[0].createdAt);
  const daysSince = (Date.now() - lastCheckIn.getTime()) / (1000 * 60 * 60 * 24);
  return daysSince <= ENGAGEMENT_THRESHOLD_DAYS ? 'engaged' : 'returning';
}

/**
 * Build a context-aware initial greeting based on user's goals, check-ins, and engagement
 */
export function buildInitialGreeting(context: ChatContext): string {
  const engagementStatus = getEngagementStatus(context);
  const hasGoals = context.goals.length > 0;
  const hasCheckIns = context.recentCheckIns.length > 0;
  const hasSummary = context.userSummary !== null;

  // New user with no goals or check-ins
  if (!hasGoals && !hasCheckIns) {
    return "Hey! I'm your resolution coach. What goals are you working on these days?";
  }

  // New user with goals but no check-ins yet
  if (hasGoals && !hasCheckIns) {
    const goalTitle = context.goals[0].title;
    return `Hey! I see you're working on "${goalTitle}" - how's that going so far?`;
  }

  // Returning user (away for more than 3 days)
  if (engagementStatus === 'returning') {
    if (hasGoals) {
      const goalTitle = context.goals[0].title;
      return `Good to see you! What's been on your mind lately with "${goalTitle}"?`;
    }
    return "Good to see you! What's been on your mind lately?";
  }

  // Engaged user (checked in within last 3 days)
  if (engagementStatus === 'engaged') {
    // If we have user summary with patterns or struggles, reference them
    if (hasSummary && context.userSummary!.struggles.length > 0) {
      const struggle = context.userSummary!.struggles[0];
      return `Hey! How are you feeling about things? Any progress on ${struggle.toLowerCase()}?`;
    }

    // Reference a specific goal
    if (hasGoals) {
      const goalTitle = context.goals[0].title;
      // If the last check-in was about a specific goal, ask about that
      const lastCheckIn = context.recentCheckIns[0];
      if (lastCheckIn?.goalId) {
        const matchingGoal = context.goals.find(g => g.id === lastCheckIn.goalId);
        if (matchingGoal) {
          return `Hey! How's "${matchingGoal.title}" going since we last talked?`;
        }
      }
      return `Hey! How did things go with "${goalTitle}" recently?`;
    }

    return "Hey! How have things been going since we last talked?";
  }

  // Fallback
  return "Hey! What's on your mind today?";
}
