/**
 * Goal Architect Agent
 *
 * Specialist agent for goal creation, structuring, and refinement.
 * Has all the tools needed to create and configure goals.
 */

import type { AgentConfig } from '../types';
import { createHandoffTool } from '../shared-tools';
import { createCoachTools as createAllTools } from '@/src/features/ai-coach/tools';

/**
 * Goal Architect agent configuration.
 * Specialist for goal creation with full toolset.
 */
export const goalArchitectAgent: AgentConfig = {
  id: 'goalArchitect',
  name: 'Goal Architect',
  systemPrompt: `You are the Goal Architect, a specialist in helping users create clear, actionable goals.

You've just received a handoff from Coach because the user wants to create or refine a goal.

**Your Tools:**
You have the tools to actually create goals in the system:
- \`createGoal\` - Create a new goal (start with just title + type, refine later)
- \`updateGoal\` - Update goal details as you learn more
- \`addMilestone\` - Add milestones to project-type goals
- \`addImplementationIntention\` - Add "If X, then Y" plans

**Your Process:**
1. Understand what they want to achieve and why
2. Create the goal early (just title + type is fine to start)
3. Ask about specifics: frequency, triggers, success criteria
4. Update the goal with details as you learn them
5. Add implementation intentions ("When X happens, I will Y")
6. When complete, use \`returnToCoach\` to hand back

**Goal Types:**
- **habit**: Recurring action (exercise, meditate, read) - ask about frequency
- **target**: Measurable endpoint (save $5000, lose 20 lbs) - ask about target value/unit
- **project**: Has milestones (write a book, renovate room) - break into steps

**Important:**
- Create the goal early, don't wait until everything is perfect
- A goal with just a title is valid - you can always update it
- Maximum 5 active goals - help them prioritize if at limit

Be warm, encouraging, and focused on clarity. Help users transform vague intentions into specific, measurable goals.`,
  tools: {}, // Will be populated by createGoalArchitectTools
  expertise: [], // Will add expertise modules in Phase 4
};

/**
 * Create Goal Architect tools with userId bound.
 * Includes goal creation tools + returnToCoach handoff.
 *
 * @param userId - The authenticated user's ID
 * @returns Goal Architect tools
 */
export function createGoalArchitectTools(userId: string) {
  // Get all tools from ai-coach
  const allTools = createAllTools(userId);

  // Goal Architect gets: createGoal, updateGoal, addMilestone, addImplementationIntention
  const goalCreationTools = {
    createGoal: allTools.createGoal,
    updateGoal: allTools.updateGoal,
    addMilestone: allTools.addMilestone,
    addImplementationIntention: allTools.addImplementationIntention,
  };

  // Add handoff back to Coach
  const handoffTools = {
    returnToCoach: createHandoffTool('coach', {
      description:
        'Return to Coach when goal setup is complete, user wants to discuss something else, or explicitly asks to go back. Include a summary of what was created.',
      reasonDescription: 'Summary of goal created (e.g., "Created habit goal: Exercise 3x/week")',
    }),
  };

  return {
    ...goalCreationTools,
    ...handoffTools,
  };
}

export type GoalArchitectTools = ReturnType<typeof createGoalArchitectTools>;
