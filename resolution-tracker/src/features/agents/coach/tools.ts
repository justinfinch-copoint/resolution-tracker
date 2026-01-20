/**
 * Coach Agent Tools
 *
 * Tools for ongoing coaching: check-ins, sentiment tracking, goal completion.
 * Goal CREATION tools are in Goal Architect - Coach must hand off for new goals.
 */

import { createCoachTools as createAllCoachTools } from '@/src/features/ai-coach/tools';
import { createHandoffTool } from '../shared-tools';

export type { CoachTools } from '@/src/features/ai-coach/tools';

/**
 * Create Coach agent tools with userId bound.
 * Only includes coaching tools - goal creation is handled by Goal Architect.
 *
 * @param userId - The authenticated user's ID
 * @returns Coach tools (no goal creation)
 */
export function createCoachAgentTools(userId: string) {
  const allTools = createAllCoachTools(userId);

  // Explicitly pick only the tools Coach should have (no goal creation tools)
  return {
    // Coaching tools - for tracking progress on EXISTING goals
    recordCheckIn: allTools.recordCheckIn,
    updateGoalSentiment: allTools.updateGoalSentiment,
    completeMilestone: allTools.completeMilestone,
    updateUserSummary: allTools.updateUserSummary,
    markGoalComplete: allTools.markGoalComplete,
    pauseGoal: allTools.pauseGoal,
    resumeGoal: allTools.resumeGoal,

    // Handoff tool - for NEW goals, transfer to Goal Architect
    transferToGoalArchitect: createHandoffTool('goalArchitect', {
      description:
        'REQUIRED: Call this immediately when user wants to create a new goal. Trigger phrases: "I want to start...", "I want to begin...", "I need to...", "I should...", or any new goal intention. You cannot create goals - Goal Architect handles that.',
      reasonDescription:
        'Brief description of the goal intent (e.g., "User wants to start exercising regularly")',
    }),
  };
}
