/**
 * Goal Architect Agent
 *
 * Specialist agent for goal creation, structuring, and refinement.
 * Has all the tools needed to create and configure goals.
 */

import type { AgentConfig } from '../types';
import { GOAL_ARCHITECT_SYSTEM_PROMPT } from './system-prompt';

// Re-export tools and types
export { createGoalArchitectTools } from './tools';
export type { GoalArchitectTools } from './tools';

/**
 * Goal Architect agent configuration.
 * Specialist for goal creation with full toolset.
 */
export const goalArchitectAgent: AgentConfig = {
  id: 'goalArchitect',
  name: 'Goal Architect',
  systemPrompt: GOAL_ARCHITECT_SYSTEM_PROMPT,
  tools: {}, // Populated by createGoalArchitectTools at runtime
  expertise: [
    'smart-criteria',
    'goal-types',
    'implementation-intentions',
  ],
};
