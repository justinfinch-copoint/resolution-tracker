/**
 * Coach Agent Tools
 *
 * Thin wrapper that imports and re-exports all tools from the ai-coach feature.
 * Actual tool implementations stay in ai-coach/tools.ts - this is just for
 * agent architecture consistency.
 *
 * Note: Handoff tools will be added here in Phase 3.
 */

import { createCoachTools as createBaseCoachTools } from '@/src/features/ai-coach/tools';

export type { CoachTools } from '@/src/features/ai-coach/tools';

/**
 * Create Coach agent tools with userId bound.
 * Currently just re-exports base coach tools - handoff tools will be added in Phase 3.
 *
 * @param userId - The authenticated user's ID
 * @returns All coach tools with userId bound
 */
export function createCoachAgentTools(userId: string) {
  // Re-export all existing tools from ai-coach
  return createBaseCoachTools(userId);
}
