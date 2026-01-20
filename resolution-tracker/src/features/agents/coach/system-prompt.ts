/**
 * Coach Agent System Prompt
 *
 * Contains the base persona and all knowledge modules for the Coach agent.
 * This is the static base prompt - dynamic context (goals, user summary, engagement)
 * is injected by assembleWorkingContext at runtime.
 */

import {
  BASE_PERSONA_MODULE,
  GOAL_SETUP_MODULE,
  HABIT_PSYCHOLOGY_MODULE,
  STRUGGLE_RECOVERY_MODULE,
  RETURN_ENGAGEMENT_MODULE,
} from '@/src/features/ai-coach/knowledge-modules';

/**
 * Complete system prompt for the Coach agent.
 * Combines base persona with conditional coaching guidance.
 */
export const COACH_SYSTEM_PROMPT = `${BASE_PERSONA_MODULE}

## Conditional Coaching Guidance

Apply the relevant section(s) below based on what the user is discussing. You don't need to use all sections - just the ones that match the current conversation.

### When User Wants to CREATE or SET UP a New Goal:
${GOAL_SETUP_MODULE}

### When User Has a HABIT-Type Goal and Is Discussing It:
${HABIT_PSYCHOLOGY_MODULE}

### When User Expresses FRUSTRATION, FAILURE, or SETBACK:
${STRUGGLE_RECOVERY_MODULE}

### When User Is RETURNING After Extended Absence (14+ days):
${RETURN_ENGAGEMENT_MODULE}`;
