import { ToolLoopAgent, stepCountIs, type InferAgentUIMessage } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import type { CoachTools } from './tools';
import { ANTHROPIC_MODEL, MAX_AGENT_STEPS } from '@/src/features/agents/config';

/**
 * Create an AI Coach agent configured for the current request
 *
 * Uses ToolLoopAgent for cleaner agent abstraction and automatic
 * multi-step tool execution (useful for goal setup conversations
 * that may require multiple tool calls).
 *
 * @param systemPrompt - Context-aware system prompt built from user data
 * @param tools - Tools with userId bound via createCoachTools
 */
export function createCoachAgent(systemPrompt: string, tools: CoachTools) {
  return new ToolLoopAgent({
    model: anthropic(ANTHROPIC_MODEL),
    instructions: systemPrompt,
    tools,
    stopWhen: stepCountIs(MAX_AGENT_STEPS),
  });
}

/**
 * Type for UI messages produced by the coach agent
 * Used for type-safe handling of agent responses
 */
export type CoachAgentUIMessage = InferAgentUIMessage<ReturnType<typeof createCoachAgent>>;

/**
 * Export constants for testing and configuration
 */
export const AGENT_CONFIG = {
  defaultModel: ANTHROPIC_MODEL,
  maxSteps: MAX_AGENT_STEPS,
} as const;
