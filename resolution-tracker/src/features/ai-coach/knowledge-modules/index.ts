/**
 * Knowledge Modules Index
 *
 * Exports all knowledge modules and provides a combined prompt builder.
 * All modules are always included with conditional activation headers -
 * the AI self-selects which sections to apply based on user context.
 */

import { BASE_PERSONA_MODULE } from './base-persona';
import { GOAL_SETUP_MODULE } from './goal-setup';
import { HABIT_PSYCHOLOGY_MODULE } from './habit-psychology';
import { STRUGGLE_RECOVERY_MODULE } from './struggle-recovery';
import { RETURN_ENGAGEMENT_MODULE } from './return-engagement';

// Re-export all modules for direct access
export {
  BASE_PERSONA_MODULE,
  GOAL_SETUP_MODULE,
  HABIT_PSYCHOLOGY_MODULE,
  STRUGGLE_RECOVERY_MODULE,
  RETURN_ENGAGEMENT_MODULE,
};

/**
 * Build the complete knowledge modules prompt with all modules included.
 *
 * All modules are always included with conditional activation headers.
 * The AI self-selects which sections to apply based on the user's message.
 *
 * This approach was chosen over rule-based selection because:
 * - Simpler implementation (no routing logic)
 * - Zero additional latency (no classification step)
 * - Handles intent detection naturally (AI understands context)
 * - Token overhead is acceptable for the simplicity gained
 */
export function buildKnowledgeModulesPrompt(): string {
  return `${BASE_PERSONA_MODULE}

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
}
