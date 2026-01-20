/**
 * Agent Orchestrator
 *
 * Central coordination for multi-agent conversations.
 * Manages agent registry, message processing, and streaming responses.
 *
 * Phase 2: Single-agent (Coach only) with streaming via Vercel AI SDK.
 * Phase 3+: Will add handoff detection and multi-agent routing.
 */

import { ToolLoopAgent, stepCountIs } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import type { AgentConfig, AgentId } from './types';
import type { SessionResponse } from './memory/types';
import { assembleWorkingContext } from './memory';
import { coachAgent, createCoachAgentTools } from './coach';
import { goalArchitectAgent, createGoalArchitectTools } from './goal-architect';
import { ANTHROPIC_MODEL, MAX_AGENT_STEPS, AI_TIMEOUT_MS } from './config';

/**
 * Custom error for orchestrator-specific failures.
 * Includes error code for proper HTTP response mapping.
 */
export class OrchestratorError extends Error {
  constructor(
    message: string,
    public readonly code: 'UNKNOWN_AGENT' | 'NO_TOOL_FACTORY' | 'CONTEXT_ASSEMBLY_FAILED'
  ) {
    super(message);
    this.name = 'OrchestratorError';
  }
}

/**
 * Agent registry - maps agent IDs to their configurations.
 * Phase 2: Only Coach registered.
 * Future agents will be added here as they're implemented.
 */
export const agentRegistry: Partial<Record<AgentId, AgentConfig>> = {
  coach: coachAgent,
  goalArchitect: goalArchitectAgent,
  // Future agents (Phase 4+):
  // patternAnalyst: patternAnalystAgent,
  // motivator: motivatorAgent,
  // accountabilityPartner: accountabilityPartnerAgent,
};

/**
 * Tool factory registry - maps agent IDs to their tool creation functions.
 * Each function takes userId and returns bound tools.
 * Using 'any' for tool types as Vercel AI SDK's Tool generic is complex.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ToolFactory = (userId: string) => Record<string, any>;

const toolFactoryRegistry: Partial<Record<AgentId, ToolFactory>> = {
  coach: createCoachAgentTools,
  goalArchitect: createGoalArchitectTools,
  // Future agents will have their own tool factories
};

/**
 * Create an agent instance for processing messages.
 *
 * This function:
 * 1. Gets agent config from registry using session's activeAgent
 * 2. Creates tools with userId binding
 * 3. Assembles working context (system prompt + scoped messages + long-term memory)
 * 4. Returns a ToolLoopAgent configured for streaming
 *
 * @param session - Current session state (includes activeAgent and message history)
 * @param userId - Authenticated user's ID
 * @returns Promise resolving to configured ToolLoopAgent
 */
export async function createAgentForSession(
  session: SessionResponse,
  userId: string
) {
  const agentId = session.activeAgent;
  const agentConfig = agentRegistry[agentId];

  if (!agentConfig) {
    throw new OrchestratorError(
      `Unknown agent: ${agentId}. Agent may not be registered yet.`,
      'UNKNOWN_AGENT'
    );
  }

  // Get tool factory for this agent
  const toolFactory = toolFactoryRegistry[agentId];
  if (!toolFactory) {
    throw new OrchestratorError(
      `No tool factory registered for agent: ${agentId}`,
      'NO_TOOL_FACTORY'
    );
  }

  // Create tools with userId bound
  const tools = toolFactory(userId);

  // Debug: Log available tools for this agent
  console.log(`[Orchestrator] Creating agent '${agentId}' with tools:`, Object.keys(tools));

  // Assemble working context with exception handling
  let contextResult;
  try {
    contextResult = await assembleWorkingContext(
      agentId,
      agentConfig.systemPrompt,
      session.messages,
      userId
    );
  } catch (error) {
    throw new OrchestratorError(
      `Failed to assemble context: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'CONTEXT_ASSEMBLY_FAILED'
    );
  }

  if (!contextResult.success) {
    throw new OrchestratorError(
      contextResult.error.message,
      'CONTEXT_ASSEMBLY_FAILED'
    );
  }

  const { systemPrompt } = contextResult.data;

  // Return configured ToolLoopAgent with timeout
  return new ToolLoopAgent({
    model: anthropic(ANTHROPIC_MODEL),
    instructions: systemPrompt,
    tools,
    stopWhen: stepCountIs(MAX_AGENT_STEPS),
    timeout: AI_TIMEOUT_MS,
  });
}

/**
 * Get an agent configuration by ID.
 * Useful for accessing agent metadata (name, expertise) without processing.
 */
export function getAgent(agentId: AgentId): AgentConfig | undefined {
  return agentRegistry[agentId];
}

/**
 * Get IDs of currently registered agents.
 * Note: Returns only agents that have been registered in agentRegistry,
 * NOT all possible AgentId values. Use AGENT_IDS for the full enum.
 * @returns Array of registered agent IDs (subset of AgentId)
 */
export function getRegisteredAgentIds(): AgentId[] {
  return Object.keys(agentRegistry) as AgentId[];
}
