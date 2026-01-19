import type { tool } from 'ai';
import type { AgentId, SessionMessage } from './memory/types';

// Re-export memory types for convenience
export type {
  AgentId,
  SessionMessage,
  AgentTransition,
  WorkingContext,
  LongTermMemory,
  MessageScopingConfig,
} from './memory/types';

// Re-export the AgentId values array
export { AGENT_IDS } from './memory/types';

/**
 * Runtime state for the agent orchestrator.
 * Tracks which agent is active and transition history.
 */
export interface AgentState {
  activeAgent: AgentId;
  transitionHistory: Array<{
    from: AgentId;
    to: AgentId;
    reason: string;
    timestamp: string; // ISO 8601 (matches DB schema)
  }>;
}

/**
 * Configuration for an agent.
 * Defines personality, capabilities, and behavior.
 */
export interface AgentConfig {
  id: AgentId;
  name: string; // Display name for UI (e.g., "Coach", "Goal Architect")
  systemPrompt: string;
  tools: Record<string, ReturnType<typeof tool>>;
  expertise: string[]; // Knowledge module IDs to include in context
  messageFilter?: (message: SessionMessage) => boolean; // For scoped context
}

/**
 * Return type for handoff tools.
 * When a tool returns this shape, the orchestrator triggers agent transition.
 */
export interface HandoffResult {
  handoff: AgentId;
  reason: string;
  context?: string; // Optional context to pass to target agent
  announcement: string; // Message shown to user (e.g., "Let me bring in the Goal Architect...")
}

/**
 * Response from the orchestrator after processing a message.
 */
export interface AgentResponse {
  text: string;
  agentId: AgentId;
  toolResults?: unknown[]; // Vercel AI SDK tool results
}
