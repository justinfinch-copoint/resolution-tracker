/**
 * Coach Agent Configuration
 *
 * The Coach is the primary conversational agent for goal tracking.
 * It provides warm, supportive coaching with expertise in habit psychology,
 * goal setup, struggle recovery, and returning user engagement.
 */

import type { AgentConfig } from '../types';
import { COACH_SYSTEM_PROMPT } from './system-prompt';

export { createCoachAgentTools } from './tools';
export type { CoachTools } from './tools';
export { buildInitialGreeting } from './greeting';

/**
 * Coach agent configuration.
 *
 * Note: The `tools` field is empty because tools require userId binding at runtime.
 * Use `createCoachAgentTools(userId)` to create bound tools for actual invocation.
 */
export const coachAgent: AgentConfig = {
  id: 'coach',
  name: 'Coach',
  systemPrompt: COACH_SYSTEM_PROMPT,
  tools: {}, // Tools created with userId at runtime via createCoachAgentTools
  expertise: [
    'base-persona',
    'goal-setup',
    'habit-psychology',
    'struggle-recovery',
    'return-engagement',
  ],
};
