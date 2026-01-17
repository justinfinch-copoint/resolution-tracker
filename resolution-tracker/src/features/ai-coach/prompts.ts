import type { ChatContext } from './types';
import { buildKnowledgeModulesPrompt } from './knowledge-modules';

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
    // Try to reference recent context
    const lastCheckIn = context.recentCheckIns[0];

    // If we have user summary with patterns or struggles, reference them
    if (hasSummary && context.userSummary!.struggles.length > 0) {
      const struggle = context.userSummary!.struggles[0];
      return `Hey! How are you feeling about things? Any progress on ${struggle.toLowerCase()}?`;
    }

    // Reference a specific goal
    if (hasGoals) {
      const goalTitle = context.goals[0].title;
      // If the last check-in was about a specific goal, ask about that
      if (lastCheckIn.goalId) {
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

/**
 * Build the system prompt for the AI coach
 * Includes persona, user context, goals, and patterns from summary
 */
export function buildSystemPrompt(context: ChatContext): string {
  const engagementStatus = getEngagementStatus(context);
  // Calculate days since last check-in for AI context
  const daysSinceLastCheckIn = context.recentCheckIns.length > 0
    ? Math.floor((Date.now() - new Date(context.recentCheckIns[0].createdAt).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const goalsSection = context.goals.length > 0
    ? `
## User's Active Goals
${context.goals.map((g, i) => `${i + 1}. "${g.title}" (${g.goalType}) - ID: ${g.id}`).join('\n')}
`
    : `
## User's Active Goals
The user hasn't set any goals yet. You might gently encourage them to set some, but don't push.
`;

  const summarySection = context.userSummary
    ? `
## What You Know About This User
${context.userSummary.patterns.length > 0 ? `**Patterns noticed:** ${context.userSummary.patterns.join('; ')}` : ''}
${context.userSummary.wins.length > 0 ? `**Past wins:** ${context.userSummary.wins.join('; ')}` : ''}
${context.userSummary.struggles.length > 0 ? `**Challenges they've faced:** ${context.userSummary.struggles.join('; ')}` : ''}
`
    : `
## What You Know About This User
This is a new user or you haven't gathered much context yet. Be welcoming and curious.
`;

  const recentCheckInsSection = context.recentCheckIns.length > 0
    ? `
## Recent Conversation History
Here are their recent check-ins (most recent first):
${context.recentCheckIns.slice(0, 5).map((c) => `- "${c.content}" (${c.createdAt})`).join('\n')}
`
    : '';

  // Build knowledge modules - all modules included with conditional headers
  // AI self-selects which sections to apply based on user message
  const knowledgeModules = buildKnowledgeModulesPrompt();

  return `${knowledgeModules}

${goalsSection}
${summarySection}
${recentCheckInsSection}

## Probing for Progress

Your primary job is to help users reflect on their goals. Don't wait for them to volunteer information - ask directly but warmly.

**Goal-Specific Questions:**
- Reference their actual goals by name: "How's [goal title] going?"
- Connect to past context: "Last time you mentioned [pattern/struggle] - any updates?"
- Ask about specific aspects: "What's one thing you did toward [goal] this week?"

**When Users Give Vague Responses:**
If they say things like "fine", "okay", "not much", dig deeper:
- "Tell me more - what does 'okay' look like for [goal]?"
- "What's been the biggest challenge lately?"
- "Any small wins, even tiny ones?"

**One Goal Per Exchange:**
Focus on one goal at a time. Don't overwhelm with questions about everything.

## Adaptive Tone

**Current user engagement status: ${engagementStatus}**
${daysSinceLastCheckIn !== null ? `**Days since last check-in: ${daysSinceLastCheckIn}**` : '**First conversation with this user**'}

Adjust your approach based on this engagement status:
- **new**: Be welcoming, help them get started
- **engaged**: Be direct, reference recent conversations
- **returning**: Be warm without mentioning the gap (if 14+ days, this is an extended absence - apply Return Engagement guidance)`;
}
