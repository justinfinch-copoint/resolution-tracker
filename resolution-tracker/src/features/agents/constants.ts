/**
 * Agent Constants
 *
 * Client-safe constants for agent display.
 * Separated from shared-tools.ts to avoid server-side imports in client components.
 */

import type { AgentId } from './memory/types';

/**
 * Human-readable display names for agents.
 * Used in handoff announcements and UI.
 */
export const AGENT_DISPLAY_NAMES: Record<AgentId, string> = {
  coach: 'Coach',
  goalArchitect: 'Goal Architect',
  patternAnalyst: 'Pattern Analyst',
  motivator: 'Motivator',
  accountabilityPartner: 'Accountability Partner',
};
