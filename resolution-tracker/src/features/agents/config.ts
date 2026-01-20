/**
 * Agent Configuration Constants
 *
 * Shared configuration for all agent implementations.
 * Single source of truth for model settings and limits.
 */

/**
 * Anthropic model to use for agent conversations.
 * Configurable via ANTHROPIC_MODEL env var.
 */
export const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';

/**
 * Maximum number of tool call steps per agent invocation.
 * Prevents infinite loops in multi-step tool use.
 */
export const MAX_AGENT_STEPS = 10;

/**
 * Timeout configuration for AI model calls (in milliseconds).
 * Prevents requests from hanging indefinitely.
 */
export const AI_TIMEOUT_MS = 120_000; // 2 minutes
