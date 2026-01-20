/**
 * Shared Tools
 *
 * Tool factories shared across multiple agents.
 * Primarily handoff tools for agent-to-agent transitions.
 */

import { tool } from 'ai';
import { z } from 'zod';
import type { AgentId, HandoffResult } from './types';

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

/**
 * Configuration for creating a handoff tool.
 */
export interface HandoffToolConfig {
  /** Description for when the LLM should use this tool */
  description: string;
  /** Optional description for the reason parameter */
  reasonDescription?: string;
}

/**
 * Create a handoff tool for transitioning to a target agent.
 *
 * The tool returns a HandoffResult that the orchestrator detects
 * in the onFinish callback to trigger the agent transition.
 *
 * @param targetAgent - The agent ID to transition to
 * @param config - Tool configuration (description, etc.)
 * @returns A configured tool that returns HandoffResult
 */
export function createHandoffTool(
  targetAgent: AgentId,
  config: HandoffToolConfig
) {
  // F5 fix: Fallback to agent ID if display name not found
  const targetDisplayName = AGENT_DISPLAY_NAMES[targetAgent] ?? targetAgent;

  const handoffInputSchema = z.object({
    reason: z
      .string()
      .describe(
        config.reasonDescription ??
          'Brief explanation of why this handoff is appropriate'
      ),
    context: z
      .string()
      .optional()
      .describe('Optional context to pass to the target agent'),
  });

  return tool({
    description: config.description,
    inputSchema: handoffInputSchema,
    execute: async ({ reason, context }): Promise<HandoffResult> => {
      return {
        handoff: targetAgent,
        reason,
        context,
        announcement: `Switching to ${targetDisplayName}...`,
      };
    },
  });
}
